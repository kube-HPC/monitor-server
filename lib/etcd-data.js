const Etcd = require('@hkube/etcd');
const etcd3 = null
const etcdv2 = require('node-etcd');
const events = require('events');
const Logger = require('@hkube/logger');

let log;

class etcdData extends events {
    constructor() {
        super();
        this.etcd = new Etcd();;
        this.etcd3 = null;
    }
    async init(options = { etcd: { host: 'localhost', port: 4001 } }) {
        log=Logger.GetLogFromContainer();
        log.info(`connecting to etcd at ${options.etcd.host}:${options.etcd.port}`)
        try {

            await this.etcd.init({ ...options, serviceName: "simulator-server" })
            //      this.etcd3 = this.etcd.etcd3;
            this.etcd2 = new etcdv2(`${options.etcd.host}:${options.etcd.port}`)
            this._startInerval();
        } catch (e) {
            console.error('etcd faild to init ', e);
        }

    }
    _startInerval() {
        this.intervalId = setInterval(async () => {
            let jobs = await this.getJobs();
            let workers = await this.getWorkers();
            this.emit('result', { jobs, workers })
        }, 1000);

    }

    async getJobs() {

        return new Promise((resolve, reject) => {

            this.etcd2.get("/jobResults", { recursive: true }, (err, res) => {
                if (!err) {

                    let filterdRes = res.node.nodes.filter(r => r.nodes.length >= 1).map(r => {
                        let data = r.nodes.find(t => t.key.split('/')[3] == 'status')
                        if (data) {
                            return { key: data.key.split('/')[2], ...JSON.parse(data.value) }
                        }
                    })
                    // console.log({ filterdRes });
                    resolve(filterdRes);
                    //  this.emit('result', filterdRes);
                }
                else {
                    reject([])
                }
            })
        });
    }

    async getWorkers() {
        return new Promise((resolve, reject) => {
            this.etcd2.get("/services/workers/", { recursive: true }, (err, res) => {
                if (!err) {
                    let workers = res.node.nodes.map(r => {
                        let workerId = r.key.split('/')[3]

                        if (r.value) {
                            let v = JSON.parse(r.value);
                            if (v.jobData && v.jobData.node) {
                                let splitedNodeName = v.jobData.node.split('#');
                                let splittedPipeLineName = v.jobData.jobID.split(':');
                                v.jobData.pipelineName = splittedPipeLineName[0];
                                v.jobData.node = splitedNodeName[0];
                                v.jobData.algorithemName =
                                    v.jobData.batchPart = splitedNodeName.length == 1 ? '-' : splitedNodeName[1]
                            }
                            else {
                                v.jobData = { node: "" }
                            }
                            return { workerId, data: v }

                        }
                    })
                    // console.log({ filterdRes });
                    resolve(workers);
                    // this.emit('result', filterdRes);
                }
                else {
                    reject([])
                }
            })
        });
    }
}
module.exports = new etcdData();
















