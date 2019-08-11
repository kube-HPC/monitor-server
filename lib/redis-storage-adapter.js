
const { Factory } = require('@hkube/redis-utils');
const log = require('@hkube/logger').GetLogFromContainer();
const components = require('./components');
const PREFIX_PATH = 'pipeline-driver/graph';
const { logWrappers } = require('./utils/tracing');
const LOGS_PREFIX = 'hkube:logs:all'

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
            if (options.healthchecks.logExternalRequests) {
                logWrappers([
                    'getByPattern',
                    'getLogs',
                ], this, log);
            }
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
    async getLogs(start = 0, end = 99) {
        try {
            const logs = await this._client.lrange(LOGS_PREFIX, 0, 99) || []
            const msgs = logs.map(l => JSON.parse(l));
            return msgs;
        } catch (error) {
            log.error('unable to get logs from redis', { component: components.REDIS_PERSISTENT }, error);
            return [];
        }
    }

    async deleteLogs() {
        try {
            const res = await this._client.del(LOGS_PREFIX);
            return res;
        } catch (error) {
            log.error('unable to delete logs', { component: components.REDIS_PERSISTENT }, error);
            return 0;
        }
    }


}

module.exports = new RedisAdapter();
