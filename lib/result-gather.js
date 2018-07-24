const Events = require('events');
const etcdApi = require('./etcd-data');
const graphData = require('./graph-data')
let log = require('@hkube/logger').GetLogFromContainer();
const INTERVAL = 2000;

class ResultGather extends Events {
    constructor() {
        super();
        this._working = false;
    }

    start() {
        this._startInterval();
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
                const result = {};
                this._working = true;
                const { jobs, workers, algorithms} = await etcdApi.getResult();
                const graphRes = await graphData.getGraph();
                const jobsMerge = jobs.map(j =>{ 
                    const g = graphRes.find(g => j.key === g.jobId);
                    return{ ...j, graph: g?g.graph:null }
            
            })
                this.emit('result', { jobs: jobsMerge, workers, algorithms });
            }
            catch (error) {
                log.error(error);
            }
            finally {
                this._working = false;
            }
        }, 2000);
    }

    _stopInterval() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
}

module.exports = new ResultGather();



