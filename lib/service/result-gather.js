const log = require('@hkube/logger').GetLogFromContainer();
const Events = require('events');
const etcdApi = require('./etcd-data');
const graphData = require('./graph-data');
const redisAdapter = require('./redis-storage-adapter');
const nodeStatisticsData = require('../node-statistics/statistics');
const getPipelinesStats = require('./gather-pipelines-stats');
const { logWrappers } = require('../utils/tracing');
const INTERVAL = 2000;
const component = 'ResultGather';

class ResultGather extends Events {
    constructor() {
        super();
        this._working = false;
        this._lastIntervalTime = null;
        this.experiments = [];
    }

    init(options) {
        if (options.healthchecks.logExternalRequests) {
            logWrappers([
                '_startInterval',
                '_stopInterval',
                '_resultsGatherInterval'
            ], this, log);
        }
    }

    enable(run) {
        if (run) {
            this._startInterval();
        }
        else {
            this._stopInterval();
        }
    }

    experimentRegister(name) {
        if (!this.experiments.find(exp => exp === name)) {
            this.experiments.push(name);
            etcdApi.updateExperimentList(this.experiments);
        }
    }

    experimentUnregister(name) {
        this.experiments = this.experiments.filter(exp => exp !== name);
        etcdApi.updateExperimentList(this.experiments);
    }

    checkHealth(maxDiff) {
        log.debug('ResultGather health-checks');
        if (!this._lastIntervalTime) {
            return true;
        }
        const diff = Date.now() - this._lastIntervalTime;
        log.debug(`diff = ${diff}`);

        return (diff < maxDiff);
    }

    _trimArrays(array, count = 10) {
        let res = array;
        if (Array.isArray(array)) {
            res = array.slice(0, count);
            for (let i = 0; i < res.length; i += 1) {
                res[i] = this._trimArrays(res[i]);
            }
        }
        return res;
    }

    _mapBoards(boards) {
        const batch = boards.filter(board => (!board.taskId) && board.jobId);
        const batchMap = this._mapItems(batch, 'jobId', 'nodeName');
        const task = boards.filter(board => { return (board.taskId) });
        const taskMap = (this._mapItems(task, 'jobId', 'taskId'));
        const node = boards.filter(board => { return (!board.jobId) });
        const nodeMap = this._mapItems(node, 'pipelineName', 'nodeName');
        return { batchMap, taskMap, nodeMap };
    }

    _mapItems(boards, key, innerKey) {
        return (boards.length > 0) && boards.reduce((map, board) => {
            const { id, status, boardLink } = board
            map[board[key]] = map[board[key]] || {};
            map[board[key]][board[innerKey]] = { id, status, boardLink };
            return map;
        }, {}
        ) || {};
    }

    _addBoardToNode({ node, job, batchMap, taskMap }) {
        let hasMetrics = false;
        node.boards = [];
        if (node.batch && node.batch.some(task => (task.metricsPath && task.metricsPath.tensorboard.path))) {
            hasMetrics = true;
            node.boards = batchMap[job.key] && batchMap[job.key][node.nodeName] && [{ tensorboard: { board: batchMap[job.key][node.nodeName] } }];
        }
        else {
            if (node.metricsPath && node.metricsPath.tensorboard.path) {
                hasMetrics = true;
                node.boards = taskMap[job.key] && taskMap[job.key][node.taskId] && [{ tensorboard: { board: taskMap[job.key][node.taskId] } }];
            }
        }
        return hasMetrics;
    }
    _addBoardToNodeDef({ node, pipelines, nodeMap, job, hasTensorMetrics }) {
        const pipeLineName = (job.pipeline && job.pipeline.name);
        const pipeline = pipelines.find((pipeline) => pipeline.name === pipeLineName);
        if (pipeline) {
            const nodeDef = pipeline.nodes.find(nodeDef => nodeDef.nodeName === node.nodeName);
            if (!nodeDef.boards) {
                nodeDef.boards = {
                    tensorboard: {
                        hasMetrics: hasTensorMetrics
                    },
                    board: nodeMap[pipeLineName] && nodeMap[pipeLineName][node.nodeName]
                };
            }
            else {
                nodeDef.boards.tensorboard.hasMetrics = nodeDef.boards.tensorboard.hasMetrics || hasTensorMetrics;
            }
        }
    }

    _selectBatch(batchTasks, count = 10) {
        if (!batchTasks) {
            return null;
        }

        const sorted = batchTasks.sort((a, b) => {
            const aHasErrors = !!a.error || !!a.warnings;
            const bHasErrors = !!b.error || !!b.warnings;
            return bHasErrors - aHasErrors;
        });
        const sliced = sorted.slice(0, count);

        for (let index = 0; index < sliced.length; index += 1) {
            sliced[index].input = this._trimArrays(sliced[index].input, count);
        }
        return sliced;
    }

    async _resultsGatherInterval() {
        if (this._working) {
            return;
        }
        this._lastIntervalTime = Date.now();
        try {
            this._working = true;
            const nodeStatistics = nodeStatisticsData.getLatestResult();

            const { jobs, discovery, algorithms, pipelines, algorithmBuilds, boards } = etcdApi.getLastResults();
            const { taskMap, batchMap, nodeMap } = this._mapBoards(boards);
            for (const exp of jobs) {
                exp.jobs = await this.graphGather(exp.jobs, taskMap, batchMap, nodeMap, pipelines);
            }
            const redisLogs = await redisAdapter.getLogs();
            const pipelinesStats = await getPipelinesStats();
            this.emit('result', { nodeStatistics, pipelinesStats, jobs, logs: redisLogs, discovery, algorithms, pipelines, algorithmBuilds, boards: { batchMap, taskMap, nodeMap } });
        }
        catch (error) {
            log.throttle.error(error.message, { component }, error);
        }
        finally {
            this._working = false;
        }
    }

    async graphGather(experimentJobs, taskMap, batchMap, nodeMap, pipelines) {
        const graphRes = await graphData.getGraph(experimentJobs.map(j => j.key));
        return experimentJobs.map(j => {
            const graph = graphRes[j.key];
            // TODO: removed the batchTasks for now. Can be very big
            if (graph) {
                graph.nodes.forEach(n => {
                    n.batch = this._selectBatch(n.batch);
                    n.input = this._trimArrays(n.input)
                    n.output = this._trimArrays(n.output);
                    const hasTensorMetrics = this._addBoardToNode({ node: n, job: j, taskMap, batchMap });
                    this._addBoardToNodeDef({ node: n, job: j, pipelines, nodeMap, hasTensorMetrics });

                });
            }
            return { ...j, graph };
        });
    }

    _startInterval() {
        log.debug(`_startInterval called. interval is ${this.intervalId ? 'active' : 'disabled'}`);
        if (this.intervalId) {
            return;
        }
        this.intervalId = setInterval(async () => {
            this._resultsGatherInterval();
        }, INTERVAL);
    }

    _stopInterval() {
        clearInterval(this.intervalId);
        this._lastIntervalTime = null;
        this.intervalId = null;
    }
}

module.exports = new ResultGather();
