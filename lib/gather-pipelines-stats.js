const etcd = require('./etcd-data')

let lastRun = [];

const getExecutions = () => {
   setTimeout(async () => {
       await _getExecutions();
       getExecutions();
   }, 100000, lastRun);
}

const _getExecutions = async () => {
   const res = await etcd._getExecutions(1000);
   const executions = Object.values(res);
   const names = [...new Set(executions.map(pipeline => pipeline.name))];

   lastRun = names.map(name => {
       return { name, stats: Array.from(executions
            .filter(exe => exe.name === name && exe.lastRunResult !== null)
            .map(exe => exe.lastRunResult.status)
            .reduce((acc, val) => acc.set(val, 1 + (acc.get(val) || 0)), new Map()))
        }
    });
}

const getPipelinesStats = () => {
    getExecutions();
    return lastRun;
}

module.exports = getPipelinesStats ;