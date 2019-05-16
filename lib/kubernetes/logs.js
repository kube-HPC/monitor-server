const KubernetesClient = require('@hkube/kubernetes-client').Client;
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').KUBERNETES_API;
const etcd = require('../etcd-data');

class kubernetesApi {
  constructor() {
    this._client = null;
  }

  async init(options = {}) {
    try {
      this._client = new KubernetesClient(options.kubernetes);
    }
    catch (error) {
      log.error(`Error initializing kubernetes. error: ${error.message}`, { component }, error);
      return;
    }
    log.info(`Initialized kubernetes client with options ${JSON.stringify({ ...options.kubernetes, url: this._client._config.url })}`, { component });
  }

  async getWorkerByTaskId(taskId) {
    const workers = await etcd._getWorkers();
    if (workers) {
      const foundWorkerForTask = workers.find(w =>
        w.previousTaskIds.find(task => task === taskId)
      );
      if (foundWorkerForTask) {
        return foundWorkerForTask.podName;
      }
    }
    return null;
  }

  async getLogs(taskId) {
    let logs = [];
    try {
      const podName = await this.getWorkerByTaskId(taskId);
      if (podName) {
        const log = await this._client.logs.get({
          podName,
          containerName: 'worker'
        });
        logs = this.formalizeData(log);
      } else {
        logs = [
          {
            message:
              'cannot read logs unable to find pod for this task: probably because it already closed'
          }
        ];
      }
    } catch (error) {
      log.error(
        `Error getting data to pod  kubernetes. error: ${error.message}`,
        { component },
        error
      );
    }
    return logs;
  }

  formalizeData(log) {
    return log.body.split('\n').map(line => {
      try {
        const parsedLine = JSON.parse(line);
        const time = new Date(parsedLine.meta.timestamp).toGMTString();

        return {
          meta: `${time}->(${parsedLine.level})`,
          message: parsedLine.message
        };
      } catch (error) {
        return { message: line };
      }
    });
  }
}

module.exports = new kubernetesApi();
