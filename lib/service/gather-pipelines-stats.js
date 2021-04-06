const log = require('@hkube/logger').GetLogFromContainer();
const etcd = require('./etcd-data');
let lastRun = [];
let active = false;
const INTERVAL = 1000;

const _getJobStatus = async () => {
    const jobs = await etcd.getPipelinesStats({ limit: 1000, pipelineType: 'stored' });
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

module.exports = getPipelinesStats;
