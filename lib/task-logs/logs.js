const log = require('@hkube/logger').GetLogFromContainer();
const { logModes } = require('@hkube/consts');
const elasticSearch = require('./es');
const kubernetes = require('./kubernetes');
const component = require('../consts/components').LOGS;
const { sources, formats, containers, LOGS_LIMIT } = require('./consts');
const internalKeyword = 'wrapper';
const internalSeparator = '::';
class Logs {
    constructor() {
        this._sources = new Map();
        this._sources.set(sources.k8s, kubernetes);
        this._sources.set(sources.es, elasticSearch);
    }

    init(options) {
        elasticSearch.init(options);
        kubernetes.init(options);
        this.updateSource(options.logsView.source);
        this.updateFormat(options.logsView.format);
    }

    get settings() {
        return {
            source: this._logsSource,
            format: this._logsFormat
        };
    }

    get options() {
        return {
            formats: Object.keys(formats),
            containers: Object.keys(containers),
            sources: Object.keys(sources)
        };
    }

    updateSource(source) {
        if (Object.keys(sources).includes(source)) {
            this._logsSource = source;
        }
    }

    updateFormat(format) {
        if (Object.keys(formats).includes(format)) {
            this._logsFormat = format;
            kubernetes.updateFormat(format);
        }
    }

    _getLogSource(source) {
        if (Object.keys(sources).includes(source)) {
            return this._sources.get(source);
        }
        throw new Error(`Unknown log source ${source}`);
    }

    async getLogs({ taskId, podName, nodeKind = containers.worker, source = sources.k8s, logMode = logModes.ALGORITHM, pageNum = 0, sort = 'asc', limit = LOGS_LIMIT }) {
        let logs = [];
        try {
            let skip = 0;
            if (pageNum > 0) {
                skip = (pageNum - 1) * limit;
            }
            const logSource = this._getLogSource(source);
            logs = await logSource.getLogs({
                format: this.settings.format,
                taskId,
                podName,
                nodeKind,
                pageNum,
                sort,
                skip,
                limit,
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
            timestamp: line.meta?.timestamp,
            level: line.level,
            message: line.message
        };
    }
}

module.exports = new Logs();
