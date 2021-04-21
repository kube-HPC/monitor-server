const log = require('@hkube/logger').GetLogFromContainer();
const { logModes } = require('@hkube/consts');
const elasticSearch = require('./es');
const kubernetes = require('./kubernetes');
const component = require('../consts/components').LOGS;
const formats = ['json', 'raw'];
const containers = ['worker', 'algorunner'];
const sources = ['k8s', 'es'];
const internalKeyword = 'wrapper';
const internalSeparator = '::';
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
        };
    }

    get options() {
        return {
            formats,
            containers,
            sources
        };
    }

    updateSource(source) {
        if (sources.includes(source)) {
            this._logsSourceHandler = this._sources.get(source);
            this._logsSource = source;
        }
    }

    _getLogSource(source) {
        if (sources.includes(source)) {
            return this._sources.get(source);
        }

        throw new Error(`Unknown log source ${source}`);
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

    async getLogs(taskId, podName, source, nodeKind, logMode = logModes.ALGORITHM) {
        let logs = [];
        try {
            const logSource = source ? this._getLogSource(source) : this._logsSourceHandler;
            logs = await logSource.getLogs({
                format: this.settings.format,
                taskId,
                podName,
                nodeKind
            });
            logs = logs.filter(l => this._filter(l, logMode)).map(this._format);
        }
        catch (e) {
            const error = `cannot read logs from ${source}, err: ${e.message}`;
            log.warning(error, { component });
            logs = [{
                message: error
            }];
        }
        return logs;
    }

    _filter(line, logMode) {
        if (!line) {
            return false;
        }
        if (logMode === logModes.ALL) {
            return true;
        }
        const isInternalLog = line?.message.startsWith(`${internalKeyword}${internalSeparator}`);
        if (logMode === logModes.INTERNAL && isInternalLog) {
            return true;
        }
        if (logMode === logModes.ALGORITHM && !isInternalLog) {
            return true;
        }
        return false;
    }

    _format(line) {
        return {
            timestamp: line.meta.timestamp,
            level: line.level,
            message: line.message
        };
    }
}

module.exports = new Logs();
