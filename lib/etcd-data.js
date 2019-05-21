const Events = require('events');
const Etcd = require('@hkube/etcd');
const Logger = require('@hkube/logger');
let log;

class etcdData extends Events {
    constructor() {
        super();
        this._lastJobs = Object.create(null);
        this._webhooks = Object.create(null);
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        this._client = new Etcd(options.etcd);
        await this._client.jobs.state.watch({ jobId: 'hookWatch' });
        this._webhookInterval();
    }

    async getPodsByJobId(jobId) {
        const workers = await this._getDiscoveryType('worker');
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
        const [results, status, discovery, executions, algorithms, pipelines, algorithmBuilds] = await Promise.all([
            this._getJobResults(),
            this._getJobStatus(),
            this._getDiscovery(),
            this._getExecutions(),
            this._getAlgorithms(),
            this._getStoredPipelines(),
            this._getAlgorithmBuilds()
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
        return { jobs, discovery, ...algorithms, pipelines, algorithmBuilds };
    }

    async _getExecutions() {
        const list = await this._client.executions.stored.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getStoredPipelines() {
        const list = await this._client.pipelines.list({ order: 'create', sort: 'desc' });
        return list;
    }

    async _getJobResults() {
        const list = await this._client.jobs.results.list({ order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getJobStatus(limit = 100) {
        const list = await this._client.jobs.status.list({ order: 'create', sort: 'desc', limit });
        return this._listToMap(list);
    }

    async _getDiscoveryType(type) {
        const list = await this._client.discovery.list({ serviceName: type });
        return list;
    }

    async _getDiscovery() {
        const discovery = Object.create(null);
        discovery['worker'] = await this._getDiscoveryType('worker');
        discovery['task-executor'] = await this._getDiscoveryType('task-executor');
        discovery['pipeline-driver'] = await this._getDiscoveryType('pipeline-driver');
        return discovery;
    }

    async _getAlgorithms() {
        const algorithmList = await this._client.algorithms.store.list();
        const algorithms = algorithmList.map((a) => {
            const { memReadable, ...rest } = a;
            return {
                ...rest,
                mem: a.memReadable
            }
        })
        const algorithmsForDebug = algorithms.filter(a => a.options && a.options.debug === true);
        return { algorithms, algorithmsForDebug };
    }

    async _getAlgorithmBuilds() {
        const list = await this._client.algorithms.builds.list();
        return list;
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
