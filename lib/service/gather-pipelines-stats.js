const log = require('@hkube/logger').GetLogFromContainer();
const etcd = require('./etcd-data');
let lastRun = [];
let active = false;
const INTERVAL = 100000;

const _getJobStatus = async () => {
    const jobs = await etcd.getJobsData({
        fields: {
            status: 'status.status',
            pipeline: 'status.pipeline'
        },
        limit: 1000
    });
    const names = [...new Set(jobs.map(job => job.pipeline))];

    lastRun = names.map(name => {
        return {
            name,
            stats: Array.from(
                jobs
                    .filter(job => job.pipeline === name)
                    .map(job => job.status)
                    .reduce(
                        (acc, val) => acc.set(val, 1 + (acc.get(val) || 0)),
                        new Map()
                    )
            )
        };
    });
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
