
const { Factory } = require('@hkube/redis-utils');
const pathLib = require('path');
const log = require('@hkube/logger').GetLogFromContainer();
const components = require('./components');


class RedisAdapter {
    constructor() {
        this.PREFIX_PATH = 'pipeline-driver/graph';
        this._isInit = false;
        this.client = null;
        this.currentJobId = '';
        this.path = null;
    }

    async init(options) {
        if (!this._isInit) {
            this.client = Factory.getClient(options.redis);
            this._isInit = true;
            log.info('redis initiated', { component: components.REDIS_PERSISTENT });
        }
    }

    setJobId(jobid) {
        this.currentJobId = jobid;
        this.path = pathLib.join('/', this.PREFIX_PATH, this.currentJobId);
    }
    async put(options) {
        return this._set(options);
    }

    _set(data) {
        return new Promise((resolve, reject) => { // eslint-disable-line
            if (!this.path) {
                return reject(new Error('path not set'));
            }
            this.client.set(this.path, JSON.stringify(data), (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(true);
            });
        });
    }

    async get(path) {
        return this._get(path);
    }

    _get(path = this.path) {
        return new Promise((resolve, reject) => {
            this.client.get(path, (err, res) => {
                if (err) {
                    return reject(err);
                }
                return resolve(this._tryParseJSON(res));
            });
        });
    }

    getByPattern(match = `/${this.PREFIX_PATH}/*`, count = 100) {
        return new Promise((resolve, reject) => {
            const obj = {};
            const stream = this.client.scanStream({ match, count });
            const promises = []
            stream.on('data',async resultKeys => {
                resultKeys.forEach(async k => {
                    promises.push(this.get(k));
                })
               const res=  await Promise.all(promises);
            //    res.forEach(r=>{
            //        console.log(r);
            //    })
                resolve(res);
            });
            // stream.on('end', () => {
            //     console.log('done with the keys: ', obj);
              
            // });
        })

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
