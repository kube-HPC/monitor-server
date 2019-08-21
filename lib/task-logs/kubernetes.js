const moment = require('moment');
const KubernetesClient = require('@hkube/kubernetes-client').Client;
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').KUBERNETES_API;
const formats = ['json', 'raw'];

class kubernetesLogs {
    constructor() {
        this._client = null;
        this._getLogs = this.getLogs.bind(this);
        this._formatMethods = new Map();
        this._formatMethods.set(formats[0], this._formatJson);
        this._formatMethods.set(formats[1], this._formatRaw);
    }

    init(options) {
        try {
            this._client = new KubernetesClient(options.kubernetes);
            log.info(`Initialized kubernetes client with options ${JSON.stringify({ ...options.kubernetes, url: this._client._config.url })}`, { component });
        }
        catch (error) {
            log.error(`Error initializing kubernetes. error: ${error.message}`, { component }, error);
        }
    }

    async getLogs({ container, format, taskId, podName }) {
        const formatMethod = this._formatMethods.get(format);
        const log = await this._client.logs.get({ podName, containerName: container });
        return this._formalizeData(log, taskId, formatMethod);
    }

    _formalizeData(log, taskId, formatMethod) {
        return log.body.split('\n')
            .filter(l => l)
            .map(l => formatMethod(l, taskId))
            .filter(l => l);
    }

    _formatJson(line, task) {
        try {
            const parsedLine = JSON.parse(line);
            const { taskId, component } = parsedLine.meta.internal;
            if (taskId && taskId === task && component === 'Algorunner') {
                const time = moment(parsedLine.meta.timestamp).format('MMMM Do YYYY, h:mm:ss a');
                return {
                    meta: `${time} -> (${parsedLine.level})`,
                    message: parsedLine.message
                };
            }
        }
        catch (error) {
            return null;
        }
    }

    _formatRaw(line) {
        return { message: line };
    }
}

module.exports = new kubernetesLogs();