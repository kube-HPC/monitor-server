
const package = require(process.cwd() + '/package.json');
const formatter = require(process.cwd() + '/lib/utils/formatters');
const config = module.exports = {};
const useSentinel = !!process.env.REDIS_SENTINEL_SERVICE_HOST;

config.defaultStorage = process.env.DEFAULT_STORAGE || 's3';
config.serviceName = package.name;
config.sizes = {
    maxFlowInputSize: formatter.parseInt(process.env.MAX_FLOW_INPUT_SIZE, 3000),
};

config.graph = {
    enableStreamingMetrics: formatter.parseBool(process.env.ENABLE_STREAMING_METRICS, false),
    maxBatchSize: formatter.parseInt(process.env.MAX_BATCH_SIZE, 10),

};

config.logsView = {
    format: process.env.LOGS_VIEW_FORMAT || 'json',
    source: process.env.LOGS_VIEW_SOURCE || 'k8s'
};

config.clusterName = process.env.CLUSTER_NAME || 'local';

config.elasticSearch = {
    url: process.env.ELASTICSEARCH_SERVICE_URL || `http://elasticsearch-ingest.logging.svc.${config.clusterName}:9200`,
    index: process.env.ELASTICSEARCH_LOGS_INDEX || 'logstash-*',
    type: process.env.ELASTICSEARCH_LOGS_DOC_TYPE || '_doc'

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
    basePath: 'api/v1'
};

config.rest = {
    port: process.env.SIMULATOR_SERVER_REST_PORT || 30010,
};

config.datasourceService = {
    host: process.env.DATASOURCES_SERVICE_SERVICE_HOST || 'localhost',
    port: process.env.DATASOURCES_SERVICE_SERVICE_PORT || 3005,
    protocol: 'http',
};

config.pipelineDriversQueue = {
    host: process.env.PIPELINE_DRIVER_QUEUE_SERVICE_HOST || 'localhost',
    port: process.env.PIPELINE_DRIVER_QUEUE_SERVICE_PORT || 7100,
    protocol: 'http',
    cacheTtl: formatter.parseInt(process.env.PIPELINE_DRIVER_QUEUE_CACHE_TTL, 10000)
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

config.db = {
    provider: 'mongo',
    mongo: {
        auth: {
            user: process.env.MONGODB_SERVICE_USER_NAME || 'tester',
            password: process.env.MONGODB_SERVICE_PASSWORD || 'password',
        },
        host: process.env.MONGODB_SERVICE_HOST || 'localhost',
        port: formatter.parseInt(process.env.MONGODB_SERVICE_PORT, 27017),
        dbName: process.env.MONGODB_DB_NAME || 'hkube',
    }
};

config.s3 = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    endpoint: process.env.S3_ENDPOINT_URL || 'http://127.0.0.1:9000',
    binary: formatter.parseBool(process.env.STORAGE_BINARY, false)
};

config.fs = {
    baseDirectory: process.env.BASE_FS_ADAPTER_DIRECTORY || '/var/tmp/fs/storage',
    binary: formatter.parseBool(process.env.STORAGE_BINARY, false)
};

config.storageAdapters = {
    s3: {
        connection: config.s3,
        encoding: process.env.STORAGE_ENCODING || 'bson',
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
        encoding: process.env.STORAGE_ENCODING || 'bson',
        moduleName: process.env.STORAGE_MODULE || '@hkube/fs-adapter'
    }
};

config.healthchecks = {
    path: process.env.HEALTHCHECK_PATH || '/healthz',
    port: process.env.HEALTHCHECK_PORT || '5000',
    maxDiff: process.env.HEALTHCHECK_MAX_DIFF || '30000',
    logExternalRequests: formatter.parseBool(process.env.LOG_EXTERNAL_REQUESTS, false)
}
