
var package = require(process.cwd() + '/package.json');
var config = module.exports = {};

config.serviceName = package.name;

config.rest = {
    port: process.env.SIMULATOR_SERVER_REST_PORT || 30010,
};
const useCluster = process.env.REDIS_CLUSTER_SERVICE_HOST ? true : false;
config.redis = {
    host: useCluster ? process.env.REDIS_CLUSTER_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
    port: useCluster ? process.env.REDIS_CLUSTER_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
    cluster: useCluster
};
config.etcd = {
    protocol: 'http',
    host: process.env.ETCD_CLIENT_SERVICE_HOST || 'localhost',
    port: process.env.ETCD_CLIENT_SERVICE_PORT || 4001
};
