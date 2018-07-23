const Events = require('events');
const Etcd = require('@hkube/etcd');
const Logger = require('@hkube/logger');
let log;

class etcdData extends Events {
    constructor() {
        super();
        this._client = new Etcd();
        this._lastWorkers = [];
        this._lastJobs = Object.create(null);
        this._webhooks = Object.create(null);
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        this._client.init({ ...options, serviceName: "simulator-server" });
        await this._client.jobState.watch({ jobId: 'hookWatch' });
        this._webhookInterval();
    }

    async getPodsByJobId(jobId) {
        return this._lastWorkers.filter(w => w.data.jobID === jobId).map(w => w.data.podName);
    }

    enable(run) {
        if (run) {
            this._startInterval();
        }
        else {
            this._stopInterval();
        }
    }

    addWebhook(webhook) {
        if (!this._webhooks[webhook.jobId]) {
            this._webhooks[webhook.jobId] = [];
        }
        this._webhooks[webhook.jobId].push(webhook);
    }

    _webhookInterval() {
        setInterval(() => {
            Object.keys(this._webhooks).forEach(k => {
                if (!this._lastJobs[k]) {
                    delete this._webhooks[k];
                }
            });
        }, 30000);
    }

    getResult() {
        return new Promise(async (resolve, rejecy) => {
            this._working = true;
            const promises = await Promise.all([this.getJobResults(), this.getJobStatus(), this.getWorkers(), this.getAlgorithms()]);
            const results = promises[0];
            const status = promises[1];
            const workers = promises[2];
            const algorithms = promises[3]
            this._lastJobs = status;
            const jobs = [];
            this._lastWorkers = workers;
            Object.keys(status).forEach(k => {
                jobs.push({ key: k, status: status[k], results: results[k], webhooks: this._webhooks[k] });
            });
            resolve({ jobs, workers, algorithms });
        })
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
                const promises = await Promise.all([this.getJobResults(), this.getJobStatus(), this.getWorkers(), this.getAlgorithms()]);
                const results = promises[0];
                const status = promises[1];
                const workers = promises[2];
                const algorithms = promises[3]
                this._lastJobs = status;
                const jobs = [];
                this._lastWorkers = workers;
                Object.keys(status).forEach(k => {
                    jobs.push({ key: k, status: status[k], results: results[k], webhooks: this._webhooks[k] });
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

    _stopInterval() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    async getJobResults() {
        const list = await this._client.jobResults.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async getJobStatus() {
        const list = await this._client.jobStatus.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    _listToMap(list) {
        const map = Object.create(null);
        list.forEach(r => {
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
















