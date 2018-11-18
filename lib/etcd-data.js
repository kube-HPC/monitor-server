const Events = require('events');
const Etcd = require('@hkube/etcd');
const Logger = require('@hkube/logger');
let log;

class etcdData extends Events {
    constructor() {
        super();
        this._client = new Etcd();
        this._lastJobs = Object.create(null);
        this._webhooks = Object.create(null);
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        this._client.init(options);
        await this._client.jobState.watch({ jobId: 'hookWatch' });
        this._webhookInterval();
    }

    async getPodsByJobId(jobId) {
        const workers = await this._getWorkers();
        return workers.filter(w => w.jobId === jobId).map(w => w.podName);
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


    async getResult() {
        const [results, status, discovery, executions, algorithms] = await Promise.all([
            this._getJobResults(),
            this._getJobStatus(),
            this._getDiscovery(),
            this._getExecutions(),
            this._getAlgorithms()
        ]);
        this._lastJobs = status;
        const jobs = [];
        Object.keys(status).forEach(k => {
            jobs.push({
                key: k,
                status: status[k],
                results: results[k],
                pipeline: executions[k],
                webhooks: this._webhooks[k]
            });
        });
        return { jobs, discovery, ...algorithms };
    }

    async _getExecutions() {
        const list = await this._client.execution.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getJobResults() {
        const list = await this._client.jobResults.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getJobStatus() {
        const list = await this._client.jobStatus.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getDiscovery() {
        const discovery = Object.create(null);
        const res = await this._client._client.getSortLimit('/discovery/');
        Object.entries(res).forEach(([k, v]) => {
            const [, , type, key] = k.split('/');
            if (!discovery[type]) {
                discovery[type] = [];
            }
            discovery[type].push({ key, data: JSON.parse(v) });
        });
        return discovery;
    }

    async _getWorkers() {
        const workers = [];
        const list = await this._client._client.getSortLimit('/discovery/workers');
        Object.values(list).forEach((v) => {
            workers.push(JSON.parse(v));
        });
        return workers;
    }

    async _getAlgorithms() {
        const algorithmsList = await this._client.algorithms.templatesStore.list();
        const algorithms = algorithmsList.map(a => ({ key: a.name, data: a }));
        const algorithmsForDebug = algorithms.filter(a => a.data.options && a.data.options.debug === true);
        return { algorithms, algorithmsForDebug };
    }

    _listToMap(list) {
        const map = Object.create(null);
        list.forEach(r => {
            map[r.jobId] = r;
        })
        return map;
    }
}
module.exports = new etcdData();
















