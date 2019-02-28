const etcd = require('./etcd-data')

let lastRun = [];

const getJobStatus = () => {
   setTimeout(async () => {
       await _getJobStatus();
       getJobStatus();
   }, 100000); // 100 seconds
}

const _getJobStatus = async () => {
   const res = await etcd._getJobStatus(1000);
   const jobStats = Object.values(res);
   const names = [...new Set(jobStats.map(job => job.pipeline))];

   lastRun = names.map(name => {
       return { name, stats: Array.from(jobStats
        .filter(job => job.pipeline === name)
        .map(job => job.status)
        .reduce((acc, val) => acc.set(val, 1 + (acc.get(val) || 0)), new Map()))
        }
    })
}

const getPipelinesStats = () => {
    getJobStatus();
    return lastRun.length === 0 ? undefined : lastRun;
}

module.exports = getPipelinesStats ;