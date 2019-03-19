const kubernetesClient = require('kubernetes-client');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').KUBERNETES_API;
const etcd = require('../etcd-data');

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
        if (workers) {
            const foundWorkerForTask = workers.find(w => w.previousTaskIds.find(task => task === taskId));
            if (foundWorkerForTask) {
                return foundWorkerForTask.podName;
            }
        }
        return null;
    }

    async getLogs(taskId) {
        let logs = [];
        try {
            const podName = await this.getWorkerByTaskId(taskId)
            if (podName) {
                const log = await this.client.api.v1.namespaces(this.namespace).pods(podName).log.get({ qs: { container: 'worker' } });
                logs = this.formalizeData(log);
            }
            else {
                logs = [{ message: "cannot read logs unable to find pod for this task: probably because it already closed" }]
            }
        }
        catch (error) {
            log.error(`Error getting data to pod  kubernetes. error: ${error.message}`, { component }, error);
        }
        return logs;
    }

    formalizeData(log) {
        return log.body.split('\n').map(line => {
            try {
                const parsedLine = JSON.parse(line);
                const time = new Date(parsedLine.meta.timestamp).toGMTString()

                return ({ meta: `${time}->(${parsedLine.level})`, message: parsedLine.message })
            }
            catch (error) {
                return ({ message: line })
            }
        })
    }
}

module.exports = new kubernetesApi();
