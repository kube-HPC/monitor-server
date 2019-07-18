let log = require('@hkube/logger').GetLogFromContainer();
const Events = require('events');
const etcdApi = require('./etcd-data');
const graphData = require('./graph-data');
const nodeStatisticsData = require('./node-statistics/statistics');
const getPipelinesStats = require('./gather-pipelines-stats');
const { logWrappers } = require('./utils/tracing');
const INTERVAL = 2000;

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
                '_stopInterval'
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


    async _resultsGatherInterval() {
        if (this._working) {
            return;
        }
        this._lastIntervalTime = Date.now();
        try {
            this._working = true;
            const nodeStatistics = nodeStatisticsData.getLatestResult();
            let { jobs, discovery, algorithms, algorithmsForDebug, pipelines, algorithmBuilds } = await etcdApi.getResult();
            const graphRes = await graphData.getGraph();
            const pipelinesStats = await getPipelinesStats();
            const jobsMerge = jobs.map(j => {
                const g = graphRes.find(g => j.key === g.jobId);
                return { ...j, graph: g ? g.graph : null }
            })
            algorithmsForDebug = algorithmsForDebug.map(a => (
                {
                    ...a,
                    data: {
                        ...a.data,
                        path: `${this._prefix}/${a.name}`
                    }
                }))
            this.emit('result', { nodeStatistics, pipelinesStats, jobs: jobsMerge, discovery, algorithms, algorithmsForDebug, pipelines, algorithmBuilds });
        }
        catch (error) {
            log.error(error);
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
