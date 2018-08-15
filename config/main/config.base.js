
var package = require(process.cwd() + '/package.json');
var config = module.exports = {};

config.serviceName = package.name;

config.apiServer = {
    protocol: 'http',
    host: process.env.API_SERVER_SERVICE_HOST || 'localhost',
    port: process.env.API_SERVER_SERVICE_PORT || 3000,
    base_path:'api/v1'
};

config.debugUrl={
prefix:`hkube/debug`,
suffix: `socket.io`

}    

config.rest = {
    port: process.env.SIMULATOR_SERVER_REST_PORT || 30010,
};
const useSentinel = !!process.env.REDIS_SENTINEL_SERVICE_HOST;

config.redis = {
    host: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
    port: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
    sentinel: useSentinel,
};
config.etcd = {
    protocol: 'http',
    host: process.env.ETCD_CLIENT_SERVICE_HOST || '127.0.0.1',
    port: process.env.ETCD_CLIENT_SERVICE_PORT || 4001
};
