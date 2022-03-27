const axios = require('axios').default;
const { main } = require('@hkube/config').load();
const log = require('@hkube/logger').GetLogFromContainer();
const etcd = require('./etcd-data');
const { PIPELINE_STATS } = require('../consts/components');
const { protocol, host, port } = main.pipelineDriversQueue;
const queueUrl = `${protocol}://${host}:${port}/api/v1/queue`;
const queueRequestCache = {
    lastRequest: undefined,
    data: undefined,
    ttl: main.pipelineDriversQueue.cacheTtl,
};

let lastRun = [];
let active = false;
const INTERVAL = 100000;

const _getJobStatus = async () => {
    const jobs = await etcd.getPipelinesStats({ limit: 1000 });
    lastRun = jobs;
};

const getJobStatus = async () => {
    try {
        await _getJobStatus();
    }
    catch (e) {
        log.error(e.message, { component: 'pipeline-stats' }, e);
    }
    finally {
        setTimeout(getJobStatus, INTERVAL); // 100 seconds
    }
};

const checkJobStatus = async () => {
    if (active) {
        return;
    }
    active = true;
    await getJobStatus();
};

const getPipelinesStats = async () => {
    await checkJobStatus();
    return lastRun.length === 0 ? undefined : lastRun;
};

const getQueueSize = async () => {
    if (!queueRequestCache.lastRequest || !queueRequestCache.data || Date.now() - queueRequestCache.lastRequest > queueRequestCache.ttl) {
        try {
            const response = await axios.get(`${queueUrl}/count`, {});
            queueRequestCache.lastRequest = Date.now();
            queueRequestCache.data = response.data;
        }
        catch (error) {
            log.throttle.error(error.message, { component: PIPELINE_STATS }, error);
            queueRequestCache.data = undefined;
        }
    }
    return queueRequestCache.data;
};

module.exports = {
    getPipelinesStats,
    getQueueSize
};
