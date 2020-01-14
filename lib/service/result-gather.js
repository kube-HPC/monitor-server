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
    }

    init(options) {
        this._prefix = options.debugUrl.prefix;

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

    checkHealth(maxDiff) {
        log.debug('ResultGather health-checks');
        if (!this._lastIntervalTime) {
            return true;
        }
        const diff = Date.now() - this._lastIntervalTime;
        log.debug(`diff = ${diff}`);

        return (diff < maxDiff);
    }

    _trimArrays(a, count = 10) {
        if (Array.isArray(a)) {
            a = a.slice(0, count);
            for (let i = 0; i < a.length; i++) {
                a[i] = this._trimArrays(a[i])
            }
        }
        return a;
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

        for (let index = 0; index < sliced.length; index++) {
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
            let { jobs, discovery, algorithms, algorithmsForDebug, pipelines, algorithmBuilds } = await etcdApi.getResult();
            const graphRes = await graphData.getGraph(jobs.map(j => j.key));
            const redisLogs = await redisAdapter.getLogs();
            const pipelinesStats = await getPipelinesStats();
            const jobsMerge = jobs.map(j => {
                const graph = graphRes[j.key];
                // TODO: removed the batchTasks for now. Can be very big
                if (graph) {
                    graph.nodes.forEach(n => {
                        n.batch = this._selectBatch(n.batch);
                        n.input = this._trimArrays(n.input)
                        n.output = this._trimArrays(n.output)
                    });
                }
                return { ...j, graph }
            })
            algorithmsForDebug.forEach(a => a.data = { ...a.data, path: `${this._prefix}/${a.name}` });
            this.emit('result', { nodeStatistics, pipelinesStats, jobs: jobsMerge, logs: redisLogs, discovery, algorithms, algorithmsForDebug, pipelines, algorithmBuilds });
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