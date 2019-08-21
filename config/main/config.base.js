
const package = require(process.cwd() + '/package.json');
const formatter = require('../../lib/utils/formatters');
const config = module.exports = {};
const useSentinel = !!process.env.REDIS_SENTINEL_SERVICE_HOST;

config.defaultStorage = process.env.DEFAULT_STORAGE || 's3';
config.serviceName = package.name;

config.logsView = {
    format: process.env.LOGS_VIEW_FORMAT || 'json',
    container: process.env.LOGS_VIEW_CONTAINER || 'worker',
    source: process.env.LOGS_VIEW_SOURCE || 'k8s'
};

config.jaeger = {
    protocol: 'http',
    host: process.env.JAEGER_JAEGER_QUERY_SERVICE_HOST || process.env.JAEGER_QUERY_SERVICE_HOST || '127.0.0.1',
    port: process.env.JAEGER_JAEGER_QUERY_SERVICE_PORT || process.env.JAEGER_QUERY_SERVICE_PORT || 80
};

config.kubernetes = {
    isLocal: !!process.env.KUBERNETES_SERVICE_HOST,
    namespace: process.env.NAMESPACE || 'default',
    version: '1.9'
};

config.apiServer = {
    protocol: 'http',
    host: process.env.API_SERVER_SERVICE_HOST || 'localhost',
    port: process.env.API_SERVER_SERVICE_PORT || 3000,
    base_path: 'api/v1'
};

config.debugUrl = {
    prefix: `hkube/debug`,
    suffix: `socket.io`
}

config.clusterName = process.env.CLUSTER_NAME || 'local';

config.rest = {
    port: process.env.SIMULATOR_SERVER_REST_PORT || 30010,
};

config.redis = {
    host: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_HOST : process.env.REDIS_SERVICE_HOST || 'localhost',
    port: useSentinel ? process.env.REDIS_SENTINEL_SERVICE_PORT : process.env.REDIS_SERVICE_PORT || 6379,
    sentinel: useSentinel,
};

config.etcd = {
    protocol: 'http',
    host: process.env.ETCD_CLIENT_SERVICE_HOST || '127.0.0.1',
    port: process.env.ETCD_CLIENT_SERVICE_PORT || 4001,
    serviceName: config.serviceName
};

config.s3 = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    endpoint: process.env.S3_ENDPOINT_URL || 'http://127.0.0.1:9000'
};

config.fs = {
    baseDirectory: process.env.BASE_FS_ADAPTER_DIRECTORY || '/var/tmp/fs/storage'
};

config.storageAdapters = {
    s3: {
        connection: config.s3,
        moduleName: process.env.STORAGE_MODULE || '@hkube/s3-adapter'
    },
    etcd: {
        connection: config.etcd,
        moduleName: process.env.STORAGE_MODULE || '@hkube/etcd-adapter'
    },
    redis: {
        connection: config.redis,
        moduleName: process.env.STORAGE_MODULE || '@hkube/redis-storage-adapter'
    },
    fs: {
        connection: config.fs,
        moduleName: process.env.STORAGE_MODULE || '@hkube/fs-adapter'
    }
};

config.healthchecks = {
    path: process.env.HEALTHCHECK_PATH || '/healthz',
    port: process.env.HEALTHCHECK_PORT || '5000',
    maxDiff: process.env.HEALTHCHECK_MAX_DIFF || '30000',
    logExternalRequests: formatter.parseBool(process.env.LOG_EXTERNAL_REQUESTS, true)
}
