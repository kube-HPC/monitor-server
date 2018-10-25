const Events = require('events');
const etcdApi = require('./etcd-data');
const graphData = require('./graph-data')
let log = require('@hkube/logger').GetLogFromContainer();
const { main } = require('@hkube/config').load();
const { protocol, host, port } = main.apiServer;
const { prefix, suffix } = main.debugUrl
const basicPath = `${protocol}://${host}:${port}`;
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
                let { jobs, discovery, algorithms, algorithmsForDebug,pipelines } = await etcdApi.getResult();
                const graphRes = await graphData.getGraph();
                const jobsMerge = jobs.map(j => {
                    const g = graphRes.find(g => j.key === g.jobId);
                    return { ...j, graph: g ? g.graph : null }
                })
                algorithmsForDebug = algorithmsForDebug.map(a => (
                    {
                        ...a,
                        data: { ...a.data, path: `${basicPath}/${prefix}/${a.key}/${suffix}` }
                    }))
                this.emit('result', { jobs: jobsMerge, discovery, algorithms, algorithmsForDebug,pipelines });
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



