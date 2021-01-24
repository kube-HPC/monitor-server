const ElasticClient = require('@hkube/elastic-client');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../consts/components').LOGS;

const searchComponents = [
    'Algorunner',
    "Jobs-Consumer"
];

class EsLogs {
    constructor() {
        this._client = null;
    }

    async init(options) {
        try {
            this._client = new ElasticClient({
                host: options.elasticSearch.url,
                enableLivenessCheck: false,
                keepAlive: false,
                livenessCheckInterval: -1
            });
            this._type = options.elasticSearch.type;
            this._index = options.elasticSearch.index;
            log.info(`Initialized elasticSearch client with options ${JSON.stringify(this._client.options)}`, { component });
        }
        catch (error) {
            log.error(error.message, { component }, error);
        }
    }

    addComponentCriteria() {
        const items = searchComponents.map(sc => `meta.internal.component: "${sc}"`);
        if (items.length) {
            const search = `AND (${items.join(' OR ')})`;
            return search;
        }
        return '';
    }

    async getLogs({ taskId }) {
        const body = {
            size: 500,
            sort: [{
                'meta.timestamp': {
                    order: 'asc'
                }
            }
            ],
            _source: ['message', 'level', 'meta.timestamp'],
            query: {
                bool: {
                    must: [
                        {
                            query_string: {
                                query: `meta.internal.taskId: "${taskId}" ${this.addComponentCriteria()}`
                            }
                        }
                    ]
                }
            }
        };
        const logs = await this._client.search({
            index: this._index,
            type: this._type,
            body
        });
        return logs.hits;
    }
}

module.exports = new EsLogs();
