const orderBy = require('lodash.orderby');
const KubernetesClient = require('@hkube/kubernetes-client').Client;
const log = require('@hkube/logger').GetLogFromContainer();
const { nodeKind: nodeKinds } = require('@hkube/consts');
const component = require('../consts/components').LOGS;
const { getSearchComponent } = require('./searchComponents');
const { formats, containers } = require('./consts');

class KubernetesLogs {
    constructor() {
        this._client = null;
        this._formatMethods = new Map();
        this._formatMethods.set(formats.json, this._formatJson);
        this._formatMethods.set(formats.raw, this._formatRaw);
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

    updateFormat(format) {
        this._formatMethod = this._formatMethods.get(format);
    }

    getContainerName(kind) {
        switch (kind) {
            case 'driver':
                return containers.pipelineDriver;
            case nodeKinds.DataSource:
                return undefined;
            case containers.worker:
                return containers.worker;
            default:
                throw new Error(`invalid node kind ${kind}`);
        }
    }

    async getLogs({ taskId, podName, nodeKind, pageNum, sort, limit, skip }) {
        const logData = await this._client.logs.get({ podName, containerName: this.getContainerName(nodeKind) });
        return this._formalizeData({ logData, taskId, nodeKind, pageNum, sort, limit, skip });
    }

    _formalizeData({ logData, taskId, nodeKind, pageNum, sort, limit, skip }) {
        let logs = logData.body.split('\n')
            .filter(l => l)
            .map((l, i) => ({ index: i, ...this._formatMethod(l, taskId, nodeKind) }));

        logs = orderBy(logs, l => l.index, sort);
        if (pageNum > 0) {
            logs = logs.slice(skip, pageNum * limit);
        }
        return logs;
    }

    _formatJson(str, task, nodeKind) {
        try {
            const line = JSON.parse(str);
            const { taskId, component: logComponent } = line.meta.internal;
            if (taskId) {
                if (taskId === task && getSearchComponent(nodeKind).includes(logComponent)) {
                    return line;
                }
            }
            else {
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
