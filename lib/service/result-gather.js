const log = require('@hkube/logger').GetLogFromContainer();
const Events = require('events');
const etcdApi = require('./etcd-data');
const graphData = require('./graph-data');
const redisAdapter = require('./redis-storage-adapter');
const nodeStatisticsData = require('../node-statistics/statistics');
const getPipelinesStats = require('./gather-pipelines-stats');
const { logWrappers } = require('../utils/tracing');
const board = require('./board');
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
            const { nodeStatistics, diskSpace } = nodeStatisticsData.getLatestResult();

            const { jobs, discovery, algorithms, pipelines, algorithmBuilds, boards, experiments } = etcdApi.getLastResults();
            const { taskMap, batchMap, nodeMap } = board.mapBoards(boards);
            await board.addHasMetricsToMap(nodeMap);
            for (const exp of jobs) {
                exp.jobs = await this.graphGather(exp.jobs, taskMap, batchMap, nodeMap, pipelines);
            }
            const redisLogs = await redisAdapter.getLogs();
            const pipelinesStats = await getPipelinesStats();
            this.emit('result', { nodeStatistics, diskSpace, pipelinesStats, jobs, logs: redisLogs, discovery, algorithms, pipelines, experiments, algorithmBuilds, boards: { batchMap, taskMap, nodeMap } });
        }
        catch (error) {
            log.throttle.error(error.message, { component }, error);
        }
        finally {
            this._working = false;
        }
    }

    async graphGather(experimentJobs, taskMap, batchMap) {
        const graphRes = await graphData.getGraph(experimentJobs.map(j => j.key));
        return experimentJobs.map(j => {
            const graph = graphRes[j.key];
            // TODO: removed the batchTasks for now. Can be very big
            if (graph) {
                graph.nodes.forEach(n => {
                    n.batch = this._selectBatch(n.batch);
                    n.input = this._trimArrays(n.input)
                    n.output = this._trimArrays(n.output);
                    n.boards = board.getBoards({ node: n, job: j, taskMap, batchMap });
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
