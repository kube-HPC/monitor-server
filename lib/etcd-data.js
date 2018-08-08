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
        this._client.init(options);
        await this._client.jobState.watch({ jobId: 'hookWatch' });
        this._webhookInterval();
    }

    async getPodsByJobId(jobId) {
        return this._lastWorkers.filter(w => w.data.jobID === jobId).map(w => w.data.podName);
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

    async getSotred(){
        const list = await this._client.stored.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }
    async getResult() {
        const [results, status, discovery, executions,algorithms] = await Promise.all([
            this._getJobResults(),
            this._getJobStatus(),
            this._getDiscovery(),
            this._getExecutions(),
            this._getAlgorithms()
        ]);
        this._lastJobs = status;
        const jobs = [];
        this._lastWorkers = discovery.workers;
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

    async _getAlgorithms() {
        let algorithms = [];
        algorithms = await this._client.algorithms.templatesStore.list();
        algorithms = algorithms.map(a => ({ key: a.name, data: a }));
        let algorithmsForDebug = null;
        try {
           algorithmsForDebug = algorithms.filter(a=>a.data.options&&a.data.options.debug==true)
           algorithms =  algorithms.filter(a=>!algorithmsForDebug.find(ad=>ad.key==a.key))
        } catch (error) {
            console.log(error);
        }
        return {algorithms,algorithmsForDebug};
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
















