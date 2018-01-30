const Etcd = require('@hkube/etcd');
const events = require('events');
const Logger = require('@hkube/logger');
let log;

class etcdData extends events {
    constructor() {
        super();
        this.etcd = new Etcd();
        this.etcd3 = null;
        this._lastWorkers = null;
    }

    async init(options = { etcd: { host: 'localhost', port: 4001 } }) {
        log = Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        try {
            await this.etcd.init({ ...options, serviceName: "simulator-server" })
            this.etcd3 = this.etcd.etcd3;
            this._startInterval();
        } catch (e) {
            console.error('etcd failed to init ', e);
        }
    }

    async getPodsByJobId(jobId) {
        let workers = this._lastWorkers.filter(w => w.data.jobID === jobId);
        if (workers.length === 0) {
            throw new Error(`unable to find pods for job ${jobId}`);
        }
        return workers.map(w => w.data.podName);
    }

    _startInterval() {
        this.intervalId = setInterval(async () => {
            const results = await Promise.all([this.getJobs(), this.getWorkers()]);
            this._lastWorkers = results[1];
            this.emit('result', { jobs: results[0], workers: results[1] })
        }, 1000);
    }

    async getJobs() {
        try {
            //sort(target: "Key" | "Version" | "Create" | "Mod" | "Value", order: "None" | "Ascend" | "Descend"):
            const jobs = [];
            const res = await this.etcd3.getSortLimit('/jobResults', ["Create", "Descend"]);
            Object.entries(res).forEach(([k, v]) => {
                const [, , key, type] = k.split('/');
                let job = jobs.find(j => j.key === key);
                if (!job) {
                    job = { key };
                    jobs.push(job);
                }
                job[type] = { ...JSON.parse(v) };
            })
            return jobs;

        } catch (error) {
            console.error(error)
        }
    }

    async getWorkers() {
        const res = await this.etcd3.get('/discovery/workers/');
        return Object.entries(res).map(([k, v]) => ({ key: k.split('/')[3], data: JSON.parse(v) }));
    }
}
module.exports = new etcdData();
















