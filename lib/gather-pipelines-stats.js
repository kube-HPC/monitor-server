const etcd = require('./etcd-data')
const log = require('@hkube/logger').GetLogFromContainer();
let lastRun = [];
let active = false;

const checkJobStatus = () => {
    if (active) {
        return;
    }
    active = true;
    getJobStatus();
}

const getJobStatus = async () => {
    try {
        await _getJobStatus();
    }
    catch (e) {
        log.error(e);
    }
    finally {
        setTimeout(getJobStatus, 100000); // 100 seconds
    }
}

const _getJobStatus = async () => {
    const res = await etcd._getJobStatus(1000);
    const jobStats = Object.values(res);
    const names = [...new Set(jobStats.map(job => job.pipeline))];

    lastRun = names.map(name => {
        return {
            name, stats: Array.from(jobStats
                .filter(job => job.pipeline === name)
                .map(job => job.status)
                .reduce((acc, val) => acc.set(val, 1 + (acc.get(val) || 0)), new Map()))
        }
    })
}

const getPipelinesStats = async () => {
    await checkJobStatus();
    return lastRun.length === 0 ? undefined : lastRun;
}

module.exports = getPipelinesStats;