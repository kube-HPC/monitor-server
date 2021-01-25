const KubernetesClient = require('@hkube/kubernetes-client').Client;
const log = require('@hkube/logger').GetLogFromContainer();
const { nodeKind: nodeKinds } = require('@hkube/consts');
const component = require('../consts/components').LOGS;
const { getSearchComponent } = require('./searchComponents');
const formats = ['json', 'raw'];

class KubernetesLogs {
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

    getContainerName(kind) {
        switch (kind) {
        case nodeKinds.DataSource:
            return undefined;
        case 'worker':
        default:
            return 'worker';
        }
    }

    async getLogs({ format, taskId, podName, nodeKind }) {
        const formatMethod = this._formatMethods.get(format);
        const logData = await this._client.logs.get({ podName, containerName: this.getContainerName(nodeKind) });
        return this._formalizeData(logData, taskId, formatMethod, nodeKind);
    }

    _formalizeData(logData, taskId, formatMethod, nodeKind) {
        return logData.body.split('\n')
            .filter(l => l)
            .map(l => formatMethod(l, taskId, nodeKind));
    }

    _formatJson(str, task, nodeKind) {
        try {
            const line = JSON.parse(str);
            const { taskId, component: logComponent } = line.meta.internal;
            if (taskId && taskId === task && getSearchComponent(nodeKind).includes(logComponent)) {
                return line;
            }
        }
        catch (error) {
            return null;
        }
        return null;
    }

    _formatRaw(line) {
        return { message: line };
    }
}

module.exports = new KubernetesLogs();
