const sources = {
    k8s: 'k8s',
    es: 'es'
};

const formats = {
    json: 'json',
    raw: 'raw'
};

const containers = {
    pipelineDriver: 'pipeline-driver',
    worker: 'worker',
    algorunner: 'algorunner'
};

const components = {
    Algorunner: 'Algorunner',
    Consumer: 'Jobs-Consumer',
};

const LOGS_LIMIT = 500;

module.exports = {
    sources,
    formats,
    containers,
    components,
    LOGS_LIMIT
};
