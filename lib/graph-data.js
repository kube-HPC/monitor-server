const redisAdatapr = require('./redis-storage-adapter');


const getGraph = () => {
    return redisAdatapr.getByPattern();

}


module.exports = { getGraph };