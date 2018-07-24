const redisAdapter = require('./redis-storage-adapter');

const getGraph = () => {
    return redisAdapter.getByPattern();
}

module.exports = { getGraph };