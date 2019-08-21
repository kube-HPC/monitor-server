const elasticSearch = require('./es');
const kubernetes = require('./kubernetes');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').Logs;
const formats = ['json', 'raw'];
const containers = ['worker', 'algorunner'];
const sources = ['k8s', 'es'];

class Logs {
  constructor() {
    this._sources = new Map();
    this._sources.set(sources[0], kubernetes);
    this._sources.set(sources[1], elasticSearch);
  }

  init(options) {
    elasticSearch.init(options);
    kubernetes.init(options);
    this.updateSource(options.logsView.source);
    this.updateFormat(options.logsView.format);
    this.updateContainer(options.logsView.container);
  }

  get settings() {
    return {
      format: this._logsFormat,
      container: this._logsContainer,
      source: this._logsSource
    }
  }

  get options() {
    return {
      formats,
      containers,
      sources
    }
  }

  updateSource(source) {
    if (sources.includes(source)) {
      this._logsSourceHandler = this._sources.get(source);
      this._logsSource = source;
    }
  }

  updateFormat(format) {
    if (formats.includes(format)) {
      this._logsFormat = format;
    }
  }

  updateContainer(container) {
    if (containers.includes(container)) {
      this._logsContainer = container;
    }
  }

  async getLogs(taskId, podName) {
    let logs = [];
    try {
      logs = await this._logsSourceHandler.getLogs({
        container: this.settings.container,
        format: this.settings.format,
        taskId,
        podName
      });
    }
    catch (error) {
      log.warning(`Error getting logs error: ${error.message}`, { component });
      logs = [{
        message: 'cannot read logs'
      }];
    }
    return logs;
  }
}

module.exports = new Logs();