const moment = require('moment');
const ElasticClient = require('@hkube/elastic-client');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../components').KUBERNETES_API;
const formats = ['json', 'raw'];

class EsLogs {
    constructor() {
        this._client = null;
        this._getLogs = this.getLogs.bind(this);
    }

    async init(options) {
        try {
            this._client = new ElasticClient({
                host: options.elasticSearch.url,
                enableLivenessCheck: false,
                keepAlive: false,
                livenessCheckInterval: -1
            });
            log.info(`Initialized elasticSearch client with options ${JSON.stringify(this._client.options)}`, { component });
        }
        catch (error) {
            log.error(error.message, { component }, error);
        }
    }

    async getLogs({ taskId }) {
        const body = {
            size: 500,
            sort: [{
                "meta.timestamp": {
                    order: "asc"
                }
            }
            ],
            _source: ["message", "level", "meta.timestamp", "meta.internal.component"],
            query: {
                bool: {
                    must: [
                        {
                            query_string: {
                                query: `meta.internal.taskId: \"${taskId}\"`
                            }
                        }
                    ]
                }
            }
        }
        const logs = await this._client.search({
            index: 'logstash-*',
            type: 'fluentd',
            body: body
        });
        return logs.hits.map(l => this._format(l)).filter(l => l);
    }

    _format(line) {
        try {
            if (line.meta.internal.component === 'Algorunner') {
                const time = moment(line.meta.timestamp).format('MMMM Do YYYY, h:mm:ss a');
                return {
                    meta: `${time} -> (${line.level})`,
                    message: line.message
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

module.exports = new EsLogs();
