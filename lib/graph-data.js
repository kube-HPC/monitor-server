const redisAdapter = require('./redis-storage-adapter');

const getGraph = (jobIds) => {
    return redisAdapter.getByJobIds(jobIds);
}

module.exports = { getGraph };