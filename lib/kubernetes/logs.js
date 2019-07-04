const KubernetesClient = require('@hkube/kubernetes-client').Client;
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').KUBERNETES_API;
const etcd = require('../etcd-data');

class kubernetesApi {
  constructor() {
    this._client = null;
    this._formatMethods = new Map();
    this._formatMethods.set('json', this._formatJson.bind(this));
    this._formatMethods.set('raw', this._formatRaw.bind(this));
    this._logsContainers = ['worker', 'algorunner'];
  }

  updateLogsFormat(format) {
    if (this._formatMethods.has(format)) {
      this._formatMethod = this._formatMethods.get(format);
      this._logsFormat = format;
    }
  }

  updateLogsContainer(container) {
    if (this._logsContainers.includes(container)) {
      this._logsContainer = container;
    }
  }

  getLogsFormat() {
    return {
      format: this._logsFormat,
      container: this._logsContainer
    }
  }

  async init(options = {}) {
    try {
      this._client = new KubernetesClient(options.kubernetes);
      this.updateLogsFormat(options.logsView.format);
      this.updateLogsContainer(options.logsView.container);
    }
    catch (error) {
      log.error(`Error initializing kubernetes. error: ${error.message}`, { component }, error);
      return;
    }
    log.info(`Initialized kubernetes client with options ${JSON.stringify({ ...options.kubernetes, url: this._client._config.url })}`, { component });
  }

  async getWorkerByTaskId(taskId) {
    const workers = await etcd._getDiscoveryType('worker');
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
        const log = await this._client.logs.get({ podName, containerName: this._logsContainer });
        logs = this.formalizeData(log);
      }
      else {
        logs = [{
          message: 'cannot read logs unable to find pod for this task: probably because it already closed'
        }];
      }
    }
    catch (error) {
      log.error(`Error getting data to pod  kubernetes. error: ${error.message}`, { component }, error);
    }
    return logs;
  }

  formalizeData(log) {
    return log.body.split('\n').filter(n => n).map(this._formatMethod);
  }

  _formatJson(line) {
    try {
      const parsedLine = JSON.parse(line);
      if (parsedLine.meta.internal.component === 'Algorunner') {
        const time = new Date(parsedLine.meta.timestamp).toGMTString();
        return {
          meta: `${time}->(${parsedLine.level})`,
          message: parsedLine.message
        };
      }
    }
    catch (error) {
      return { message: line };
    }
  }

  _formatRaw(line) {
    return { message: line };
  }
}

module.exports = new kubernetesApi();
