const KubernetesClient = require('@hkube/kubernetes-client').Client;
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../consts/components').LOGS;
const formats = ['json', 'raw'];

class kubernetesLogs {
    constructor() {
        this._client = null;
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
            .map(l => formatMethod(l, taskId));
    }

    _formatJson(str, task) {
        try {
            const line = JSON.parse(str);
            const { taskId, component } = line.meta.internal;
            if (taskId && taskId === task && component === 'Algorunner') {
                return line;
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
