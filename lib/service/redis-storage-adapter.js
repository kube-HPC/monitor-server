const { Factory } = require('@hkube/redis-utils');
const log = require('@hkube/logger').GetLogFromContainer();
const components = require('../consts/components');
const { logWrappers } = require('../utils/tracing');
const PREFIX_PATH = 'hkube:pipeline:graph';
const LOGS_PREFIX = 'hkube:logs:all';
const component = components.REDIS_PERSISTENT;

class RedisAdapter {
    constructor() {
        this._isInit = false;
        this._client = null;
    }

    async init(options) {
        if (!this._isInit) {
            this._client = Factory.getClient(options.redis);
            this._isInit = true;
            log.info('redis initiated', { component });
            if (options.healthchecks.logExternalRequests) {
                logWrappers([
                    'getLogs',
                    'getByJobIds'
                ], this, log);
            }
        }
    }

    async getByJobIds(jobIds) {
        if (!jobIds || jobIds.length === 0) {
            return [];
        }
        const keys = jobIds.map(j => `/${PREFIX_PATH}/${j}`);
        const values = await this._client.mget(keys);
        return values
            .filter(j => j)
            .map(r => JSON.parse(r))
            .reduce((acc, cur) => {
                acc[cur.jobId] = cur;
                return acc;
            }, {});
    }

    async getLogs(start = 0, end = 99) {
        try {
            const logs = await this._client.lrange(LOGS_PREFIX, start, end) || [];
            const msgs = logs.map(l => JSON.parse(l));
            return msgs;
        }
        catch (error) {
            log.error(`unable to get logs from redis ${error}`, { component }, error);
            return [];
        }
    }

    async deleteLogs() {
        try {
            const res = await this._client.del(LOGS_PREFIX);
            return res;
        }
        catch (error) {
            log.error(`unable to delete logs ${error}`, { component }, error);
            return 0;
        }
    }
}

module.exports = new RedisAdapter();
