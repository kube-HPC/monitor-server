let log = require('@hkube/logger').GetLogFromContainer();
const { main } = require('@hkube/config').load();
const { prefix, suffix } = main.debugUrl
const Events = require('events');
const etcdApi = require('./etcd-data');
const graphData = require('./graph-data');
const nodeStatisticsData = require('./node-statistics/statistics');
const getPipelinesStats = require('./gather-pipelines-stats');
const INTERVAL = 2000;

class ResultGather extends Events {
    constructor() {
        super();
        this._working = false;
    }

    enable(run) {
        if (run) {
            this._startInterval();
        }
        else {
            this._stopInterval();
        }
    }

    _startInterval() {
        if (this.intervalId) {
            return;
        }
        this.intervalId = setInterval(async () => {
            if (this._working) {
                return;
            }
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
                            path: `${prefix}/${a.key}/${suffix}`
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
        }, INTERVAL);
    }

    _stopInterval() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
}

module.exports = new ResultGather();
