const Etcd = require('@hkube/etcd');
const events = require('events');
const Logger = require('@hkube/logger');
let log;

class etcdData extends events {
    constructor() {
        super();
        this.etcd = new Etcd();
        this._client = null;
        this._lastWorkers = null;
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        try {
            await this.etcd.init({ ...options, serviceName: "simulator-server" })
            this._client = this.etcd._client;
            this._startInterval();
        } catch (e) {
            console.error('etcd failed to init ', e);
        }
    }

    async getPodsByJobId(jobId) {
        return this._lastWorkers.filter(w => w.data.jobID === jobId).map(w => w.data.podName);
    }

    _startInterval() {
        this.intervalId = setInterval(async () => {
            const results = await Promise.all([this.getJobs(), this.getWorkers()]);
            this._lastWorkers = results[1];
            this.emit('result', { jobs: results[0], workers: results[1] })
        }, 1000);
    }

    async getJobs() {
        let jobs = [];
        try {
            //sort(target: "Key" | "Version" | "Create" | "Mod" | "Value", order: "None" | "Ascend" | "Descend"):
            const res = await this._client.getSortLimit('/jobResults', ["Create", "Descend"]);
            Object.entries(res).forEach(([k, v]) => {
                const [, , key, type, sub] = k.split('/');
                let job = jobs.find(j => j.key === key);
                if (!job) {
                    job = { key };
                    jobs.push(job);
                }
                if (!job[type]) {
                    job[type] = {};
                }
                const value = JSON.parse(v);
                if (sub) {
                    job[type][sub] = value;
                }
                else {
                    job[type] = value;
                }
            })
        }
        catch (error) {
        }
        return jobs;
    }

    async getWorkers() {
        let workers = [];
        try {
            const res = await this._client.getSortLimit('/discovery/workers/');
            workers = Object.entries(res).map(([k, v]) => ({ key: k.split('/')[3], data: JSON.parse(v) }));
        }
        catch (error) {
        }
        return workers;
    }
}
module.exports = new etcdData();
















