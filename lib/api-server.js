const fs = require("fs");
const requestretry = require("requestretry");
const HttpError = require("./HttpError");
const { main } = require("@hkube/config").load();
const { protocol, host, port, base_path } = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;
const log = require('@hkube/logger').GetLogFromContainer();

const _retrySettings = {
    maxAttempts: 1,
    retryDelay: 2000,
    retryStrategy: requestretry.RetryStrategies.HTTPOrNetworkError
};

const request = async options => {
    const result = await requestretry({
        json: true,
        ...options,
        ..._retrySettings
    });
    if (result.body && result.body.error) {
        throw new HttpError(result.body.error);
    }
    return result.body;
};

const addAlgorithmForDebug = ({ algorithmName }) => {
    const path = `store/algorithms/debug`;
    const uri = `${baseUri}/${path}`;

    return request({
        method: "POST",
        uri,
        body: {
            name: algorithmName,
            algorithmImage: algorithmName,
            cpu: 1,
            mem: "256 Mi",
            options: {
                debug: true
            }
        }
    });
};
const applyAlgorithmToStore = ({ payload, file }) => {
    const path = `store/algorithms/apply`;
    const uri = `${baseUri}/${path}`;

    return request({
        method: "POST",
        uri,
        formData: {
            payload,
            file: (file && fs.createReadStream(file.path)) || ""
        }
    });
};
const deleteAlgorithmForDebug = algorithmName => {
    const path = `store/algorithms/debug/${algorithmName}`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "Delete",
        uri
    });
};
const deleteAlgorithmFromStore = algorithmName => {
    const path = `store/algorithms/${algorithmName}`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "Delete",
        uri
    });
};
const deletePipelineFromStore = pipelineName => {
    const path = `store/pipelines/${pipelineName}`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "Delete",
        uri
    });
};
const addPipeFromSimulator = pipeline => {
    const path = `store/pipelines`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: pipeline
    });
};
const updateStoredPipeline = pipeline => {
    const path = `store/pipelines`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "PUT",
        uri,
        body: pipeline
    });
};
const stopExecution = jobId => {
    const path = `exec/stop`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: {
            jobId,
            reason: "Request from simulator, Algorithms-tab Delete action"
        }
    });
};
const execRawPipeline = pipeline => {
    const path = `exec/raw`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: pipeline
    });
};
const execCaching = ({ jobId, nodeName }) => {
    const path = `exec/caching`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: { jobId, nodeName }
    });
};
const execStoredPipe = pipeline => {
    const path = `exec/stored`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: pipeline
    });
};
const cronStart = ({ name, pattern }) => {
    const path = `cron/start`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: { name, pattern }
    });
};
const cronStop = ({ name }) => {
    const path = `cron/stop`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: { name }
    });
};
const buildStop = ({ buildId }) => {
    const path = `builds/stop`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: { buildId }
    });
};
const buildRerun = ({ buildId }) => {
    const path = `builds/rerun`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: "POST",
        uri,
        body: { buildId }
    });
};
const getReadme = ({ name, type }) => {
    const path = `readme/${type}/${name}`;
    const uri = `${baseUri}/${path}`

    return request({
        method: 'GET',
        uri
    });
};
const postReadme = ({ name, type, data }) => {
    const formData = {
        'README.md': {
            value: Buffer.from(data),
            options: {
                filename: "README.md",
            }
        }
    }
    const path = `readme/${type}/${name}`;
    const uri = `${baseUri}/${path}`
    return request({
        method: "POST",
        uri,
        formData
    });
}

module.exports = {
    addAlgorithmForDebug,
    deleteAlgorithmForDebug,
    addPipeFromSimulator,
    execStoredPipe,
    execRawPipeline,
    deleteAlgorithmFromStore,
    applyAlgorithmToStore,
    deletePipelineFromStore,
    updateStoredPipeline,
    stopExecution,
    execCaching,
    cronStart,
    cronStop,
    buildStop,
    buildRerun,
    getReadme,
    postReadme
};
