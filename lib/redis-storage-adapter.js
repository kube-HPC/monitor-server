
const { Factory } = require('@hkube/redis-utils');
const log = require('@hkube/logger').GetLogFromContainer();
const components = require('./components');
const PREFIX_PATH = 'pipeline-driver/graph';

class RedisAdapter {
    constructor() {
        this._isInit = false;
        this._client = null;
    }

    async init(options) {
        if (!this._isInit) {
            this._client = Factory.getClient(options.redis);
            this._isInit = true;
            log.info('redis initiated', { component: components.REDIS_PERSISTENT });
        }
    }

    getByPattern(match = `/${PREFIX_PATH}/*`, count = 100) {
        return new Promise((resolve, reject) => {
            const stream = this._client.scanStream({ match, count });
            const keys = []
            stream.on('data', (k) => {
                keys.push(...k);
            });
            stream.on('end', async () => {
                let result = [];
                if (keys.length > 0) {
                    const values = await this._client.mget(keys);
                    result = values.map(r => JSON.parse(r));
                }
                resolve(result);
            })
        })
    }
}

module.exports = new RedisAdapter();
