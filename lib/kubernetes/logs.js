const kubernetesClient = require('kubernetes-client');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').KUBERNETES_API;
const etcd = require('../etcd-data');
//const {main} = require('@hkube/config').load();

class kubernetesApi {
    constructor() {
        this.config = null;
        this.namespace = null;
        this.client = null;
    }

    async init(options = {}) {
        const k8sOptions = options.kubernetes || {};
        this.namespace = k8sOptions.namespace || 'default';

        if (!k8sOptions.isLocal) {
            try {
                this.config = kubernetesClient.config.fromKubeconfig();
            }
            catch (error) {
                log.error(`Error initializing kubernetes. error: ${error.message}`, { component }, error);
                return;
            }
        }
        else {
            this.config = kubernetesClient.config.getInCluster();
        }
        log.info(`Initialized kubernetes client with options ${JSON.stringify({ options: options.kubernetes, url: this.config.url })}`, { component });
        this.client = new kubernetesClient.Client({ config: this.config, version: '1.9' });
        this.namespace = k8sOptions.namespace;
    }

    async getWorkerByTaskId(taskId) {
        const workers = await etcd._getWorkers();
        const foundWorkerForTask =  workers.find(w=>w.previousTaskIds.find(task=>task===taskId)); 
        if(foundWorkerForTask){
            return foundWorkerForTask.podName;
        }
        return null;
    }
    async getLogs(taskId = "trigger-service-947b8c75b-88kt4", container = "Algounner") {
        try {
            let stubPodName = "trigger-service-947b8c75b-88kt4";
            const podName = await this.getWorkerByTaskId(taskId)
            if(podName){
                const log = await this.client.apis.v1.namespaces(this.namespace).pods(podName).log.get({ qs: {container:'worker'} });
                return this.formalizeData(log)
            }
            else{
                return [{message:"cannot read logs unable to find pod for this task: probably because it already closed"}]
            }
            //this.formalizeData(log)  console.log(log);
            //   console.log(this.formalizeData(log));
            //log.body.split('{"meta":')[1].replace('}',"")
        } catch (error) {
            log.error(`Error getting data to pod ${[podName]} kubernetes. error: ${error.message}`, { component }, error);
        }
    }
    formalizeData(log) {
        return log.body.split('\n').map(line => {
            try {
                const parsedLine = JSON.parse(line);
                const time = new Date(parsedLine.meta.timestamp).toGMTString()

                return ({ meta: `${time}->(${parsedLine.level})`, message: parsedLine.message })
            } catch (error) {
                return ({ message: line })
            }
        })
    }
}

module.exports = new kubernetesApi();
