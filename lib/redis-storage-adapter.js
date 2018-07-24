
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
            const promises = []
            stream.on('data', async resultKeys => {
                resultKeys.forEach(async k => {
                    promises.push(this.get(k));
                })
                const res = await Promise.all(promises);
                resolve(res);
            });
        })
    }

    get(path) {
        return this._get(path);
    }

    _get(path = this.path) {
        return new Promise((resolve, reject) => {
            this._client.get(path, (err, res) => {
                if (err) {
                    return reject(err);
                }
                return resolve(this._tryParseJSON(res));
            });
        });
    }

    _tryParseJSON(json) {
        let parsed = json;
        try {
            parsed = JSON.parse(json);
        }
        catch (e) {
            log.warn(`fail to parse json ${json} `, { component: components.REDIS_PERSISTENT });
        }
        return parsed;
    }
}

module.exports = new RedisAdapter();
