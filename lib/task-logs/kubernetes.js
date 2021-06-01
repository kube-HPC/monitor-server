const KubernetesClient = require('@hkube/kubernetes-client').Client;
const { logModes } = require('@hkube/consts');
const log = require('@hkube/logger').GetLogFromContainer();
const { nodeKind: nodeKinds } = require('@hkube/consts');
const component = require('../consts/components').LOGS;
const { getSearchComponent } = require('./searchComponents');
const { formats, containers, sortOrder, internalLogPrefix } = require('./consts');

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
            case containers.pipelineDriver:
            case nodeKinds.DataSource:
                return undefined;
            case containers.worker:
                return containers.worker;
            default:
                throw new Error(`invalid node kind ${kind}`);
        }
    }

    async getLogs({ taskId, podName, nodeKind, logMode, pageNum, sort, limit, skip }) {
        let tailLines;
        if (sort === sortOrder.desc) {
            tailLines = limit;
        }
        const logsData = await this._client.logs.get({ podName, tailLines, containerName: this.getContainerName(nodeKind) });
        return this._formalizeData({ logsData, taskId, nodeKind, logMode, pageNum, sort, limit, skip });
    }

    _formalizeData({ logsData, taskId, nodeKind, logMode, pageNum, limit, skip }) {
        let logs = [];
        const logList = logsData.body.split('\n');
        logList.forEach((l) => {
            if (!l) {
                return;
            }
            const logData = this._formatMethod(l, taskId, nodeKind);
            const valid = this._filter(logData, logMode);
            if (valid) {
                logs.push(logData);
            }
        });
        if (logs.length) {
            const pageNumber = pageNum || 1;
            logs = logs.slice(skip, pageNumber * limit);
        }
        return logs;
    }

    _filter(line, logMode) {
        if (!line?.message) {
            return false;
        }
        if (logMode === logModes.ALL) {
            return true;
        }
        const isInternalLog = line.message.startsWith(`${internalLogPrefix}`);
        if (logMode === logModes.INTERNAL && isInternalLog) {
            return true;
        }
        if (logMode === logModes.ALGORITHM && !isInternalLog) {
            return true;
        }
        return false;
    }

    _formatJson(str, task, nodeKind) {
        try {
            const line = JSON.parse(str);
            const { taskId, component: logComponent } = line.meta.internal;
            if (taskId && task) {
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
