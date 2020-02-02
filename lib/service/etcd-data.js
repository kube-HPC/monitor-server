const Events = require('events');
const Etcd = require('@hkube/etcd');
const Logger = require('@hkube/logger');
const { logWrappers } = require('../utils/tracing');
let log;
const ETCD_INTERVAL = 2000;
const component = 'ETCD-Wrapper';
class EtcdData extends Events {
    constructor() {
        super();
        this._lastJobs = Object.create(null);
        this._webhooks = Object.create(null);
        this.lastJobsByExperiment = Object.create(null);
        this.lastResults = Object.create(null);
        this.experimentList = [];
        this._working = false;
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`);
        if (options.healthchecks.logExternalRequests) {
            logWrappers([
                'getPodsByJobId',
                'getResult',
                '_getExecutions',
                '_getStoredPipelines',
                '_getJobResults',
                '_getJobStatus',
                '_getDiscoveryType',
                '_getDiscovery',
                '_getAlgorithms',
                '_getAlgorithmBuilds'

            ], this, log);
        }
        this._client = new Etcd(options.etcd);
        await this._client.jobs.status.watch({ jobId: 'hookWatch' });
        this._webhookInterval();
        this.etcdInterval();
    }

    etcdInterval() {
        setInterval(async () => {
            if (this._working) {
                return;
            }
            try {
                this._working = true;
                await this.getResult();
                await this.getJobs();
            }
            catch (error) {
                log.throttle.error(error.message, { component }, error);
            }
            finally {
                this._working = false;
            }
        }, ETCD_INTERVAL);
    }

    async getPodsByJobId(jobId) {
        const workers = await this._getDiscoveryType('worker');
        return workers.filter(w => w.jobId === jobId).map(w => w.podName);
    }

    updateExperimentList(experimentList) {
        this.experimentList = experimentList;
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

    getLastResults() {
        return { jobs: this.lastJobsByExperiment, ...this.lastResults };
    }

    async getResult() {
        const [discovery, algorithms, pipelines, algorithmBuilds, experiments, boards] = await Promise.all([
            this._getDiscovery(),
            this._getAlgorithms(),
            this._getStoredPipelines(),
            this._getAlgorithmBuilds(),
            this.getExperiments(),
            this._getBoards()
        ]);
        this.lastResults = { discovery, algorithms, pipelines, algorithmBuilds, experiments, boards };
        return this.lastResults;
    }

    async getJobs() {
        const jobs = await Promise.all(this.experimentList.map(exp => this.getJobsForExperiment(exp)));
        this.lastJobsByExperiment = jobs;
        return jobs;
    }

    async getJobsForExperiment(experimentName) {
        const [results, status, executions] = await Promise.all([
            this._getJobResults(experimentName),
            this._getJobStatus(experimentName),
            this._getExecutions(experimentName),

        ]);

        this._lastJobs = status;
        const jobs = [];
        Object.keys(status).forEach(k => {
            const statusNow = status[k];
            const resultsNow = results[k];
            const pipeline = executions[k];
            // skip jobs with missing data
            if (!pipeline) {
                return;
            }
            jobs.push({
                key: k,
                status: statusNow,
                results: resultsNow,
                pipeline
            });
        });
        return { experimentName, jobs };
    }

    async _getExecutions(experimentName) {
        const list = await this._client.executions.stored.list({ jobId: `${experimentName}:`, order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getStoredPipelines() {
        const list = await this._client.pipelines.list({ order: 'create', sort: 'desc' });
        return list;
    }

    async _getJobResults(experimentName) {
        const list = await this._client.jobs.results.list({ jobId: `${experimentName}:`, order: 'create', sort: 'desc' });
        return this._listToMap(list);
    }

    async _getJobStatus(experimentName, limit = 100) {
        const jobId = (experimentName && `${experimentName}:`) || '';
        const list = await this._client.jobs.status.list({ jobId, order: 'create', sort: 'desc', limit });
        return this._listToMap(list);
    }

    async _getDiscoveryType(type) {
        const list = await this._client.discovery.list({ serviceName: type });
        return list;
    }

    async _getDiscovery() {
        const discovery = Object.create(null);
        discovery.worker = await this._getDiscoveryType('worker');
        discovery['task-executor'] = await this._getDiscoveryType('task-executor');
        discovery['pipeline-driver'] = await this._getDiscoveryType('pipeline-driver');
        return discovery;
    }

    async _getAlgorithms() {
        return this._client.algorithms.store.list();
    }

    async getExperiments() {
        const experiments = await this._client.experiments.list();
        return experiments;
    }

    async _getAlgorithmBuilds() {
        const list = await this._client.algorithms.builds.list();
        return list;
    }

    async _getBoards() {
        return this._client.tensorboard.list();
    }

    _listToMap(list) {
        const map = Object.create(null);
        list.forEach(r => {
            map[r.jobId] = r;
        });
        return map;
    }
}
module.exports = new EtcdData();
