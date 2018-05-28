const Events = require('events');
const Etcd = require('@hkube/etcd');
const Logger = require('@hkube/logger');
let log;

class etcdData extends Events {
    constructor() {
        super();
        this._client = new Etcd();
        this._lastWorkers = null;
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        try {
            await this._client.init({ ...options, serviceName: "simulator-server" })
            this._startInterval();
        }
        catch (e) {
            log.error(`${e.message}, ${options.etcd.host}:${options.etcd.port}`)
        }
    }

    async getPodsByJobId(jobId) {
        return this._lastWorkers.filter(w => w.data.jobID === jobId).map(w => w.data.podName);
    }

    _startInterval() {
        this.intervalId = setInterval(async () => {
            if (this._working) {
                return;
            }
            try {
                this._working = true;
                const promises = await Promise.all([this.getJobResults(), this.getJobStatus(), this.getWorkers(), this.getAlgorithms()]);
                const results = promises[0];
                const status = promises[1];
                const workers = promises[2];
                const algorithms = promises[3]
                const jobs = [];
                this._lastWorkers = workers;
                Object.keys(status).map(k => {
                    jobs.push({ key: k, status: status[k], results: results[k] });
                });
                this.emit('result', { jobs, workers, algorithms });
            }
            catch (error) {
                log.error(error);
            }
            finally {
                this._working = false;
            }
        }, 2000);
    }

    async getJobResults() {
        const map = Object.create(null);
        const results = await this._client.jobResults.list({ order: 'create', sort: 'desc' });
        results.forEach(r => {
            map[r.jobId] = r;
        })
        return map;
    }

    async getJobStatus() {
        const map = Object.create(null);
        const results = await this._client.jobStatus.list({ order: 'create', sort: 'desc' });
        results.forEach(r => {
            map[r.jobId] = r;
        })
        return map;
    }

    async getWorkers() {
        let workers = [];
        const res = await this._client._client.getSortLimit('/discovery/workers/');
        workers = Object.entries(res).map(([k, v]) => ({ key: k.split('/')[3], data: JSON.parse(v) }));
        return workers;
    }

    async getAlgorithms() {
        let algorithms = [];
        algorithms = await this._client.algorithms.templatesStore.list();
        algorithms = algorithms.map(a => ({ key: a.name, data: a }));
        return algorithms;
    }
}
module.exports = new etcdData();
















