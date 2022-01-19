const Events = require('events');
const log = require('@hkube/logger').GetLogFromContainer();
const etcdApi = require('./etcd-data');
const redisAdapter = require('./redis-storage-adapter');
const nodeStatisticsData = require('../node-statistics/statistics');
const getPipelinesStats = require('./gather-pipelines-stats');
const graphHelper = require('./graph-helper');
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

    async _resultsGatherInterval() {
        if (this._working) {
            return;
        }
        this._lastIntervalTime = Date.now();
        try {
            this._working = true;
            const { nodeStatistics, diskSpace } = nodeStatisticsData.getLatestResult();
            const { jobs, discovery, algorithms, pipelines, algorithmBuilds, boards, experiments, dataSources } = etcdApi.getLastResults();
            const { taskMap, batchMap, nodeMap } = board.mapBoards(boards);
            await board.addHasMetricsToMap(nodeMap);
            for (const exp of jobs) {
                exp.jobs = await graphHelper.cleanGraph(exp.jobs, taskMap, batchMap);
            }
            const redisLogs = await redisAdapter.getLogs();
            const pipelinesStats = await getPipelinesStats();
            this.emit('result', {
                nodeStatistics,
                diskSpace,
                pipelinesStats,
                jobs,
                logs: redisLogs,
                discovery,
                algorithms,
                pipelines,
                experiments,
                dataSources,
                algorithmBuilds,
                boards: { batchMap, taskMap, nodeMap }
            });
        }
        catch (error) {
            log.throttle.error(error.message, { component }, error);
        }
        finally {
            this._working = false;
        }
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
