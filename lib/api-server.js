const fs = require('fs');
const requestretry = require('requestretry');
const HttpError = require('./HttpError');
const { main } = require('@hkube/config').load();
const { protocol, host, port, base_path } = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;

const _retrySettings = {
    maxAttempts: 1,
    retryDelay: 2000,
    retryStrategy: requestretry.RetryStrategies.HTTPOrNetworkError
};


const request = async (options) => {
    const result = await requestretry({
        ...options,
        ..._retrySettings
    });
    if (result.body && result.body.error) {
        throw new HttpError(result.body.error);
    }
    return result;
}

const addAlgorithmForDebug = ({ algorithmName }) => {
    const path = `store/algorithms/debug`;
    const uri = `${baseUri}/${path}`;

    return request({
        method: 'POST',
        uri,
        body: {
            name: algorithmName,
            algorithmImage: algorithmName,
            cpu: 1,
            mem: "256 Mi",
            options: {
                debug: true
            }
        },
        json: true
    });
}
const insertAlgorithmToStore = ({ algorithm }) => {
    const path = `store/algorithms`;
    const uri = `${baseUri}/${path}`
    return request({
        method: 'POST',
        uri,
        body: algorithm,
        json: true
    });
}
const applyAlgorithmToStore = ({ payload, file }) => {
    const path = `store/algorithms/apply`;
    const uri = `${baseUri}/${path}`

    return request({
        method: 'POST',
        uri,
        formData: {
            payload,
            file: (file && fs.createReadStream(file.path)) || ''
        }
    });
}
const deleteAlgorithmForDebug = (algorithmName) => {
    const path = `store/algorithms/debug/${algorithmName}`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'Delete',
        uri,
        json: true
    });
}
const deleteAlgorithmFromStore = (algorithmName) => {
    const path = `store/algorithms/${algorithmName}`;
    const uri = `${baseUri}/${path}`
    return request({
        method: 'Delete',
        uri,
        json: true
    });

}
const deletePipelineFromStore = (pipelineName) => {
    const path = `store/pipelines/${pipelineName}`;
    const uri = `${baseUri}/${path}`
    return request({
        method: 'Delete',
        uri,
        json: true
    });
}
const addPipeFromSimulator = ({ pipeline }) => {
    const path = `store/pipelines`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: pipeline,
        json: true
    });
}
const updateStoredPipeline = ({ pipeline }) => {
    const path = `store/pipelines`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'PUT',
        uri,
        body: pipeline,
        json: true
    });
}
const stopExecution = (pipe) => {
    const path = `exec/stop`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: {
            jobId: pipe,
            reason: 'Request from simulator, Algorithms-tab Delete action'
        },
        json: true
    })
}
const execRawPipeline = (pipeline) => {
    const path = `exec/raw`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: pipeline,
        json: true
    });
}
const execCaching = ({ jobId, nodeName }) => {
    const path = `exec/caching`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: { jobId, nodeName },
        json: true
    });
}
const execStoredPipe = ({ pipe }) => {
    const path = `exec/stored`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: pipe,
        json: true
    });
}
const cronStart = ({ pipelineName }) => {
    const path = `cron/start`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: { name: pipelineName },
        json: true
    });
}
const cronStop = ({ pipelineName }) => {
    const path = `cron/stop`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: { name: pipelineName },
        json: true
    });
}
const buildStop = ({ buildId }) => {
    const path = `builds/stop`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: { buildId },
        json: true
    });
}
const buildRerun = ({ buildId }) => {
    const path = `builds/rerun`;
    const uri = `${baseUri}/${path}`;
    return request({
        method: 'POST',
        uri,
        body: { buildId },
        json: true
    });
}
module.exports = {
    addAlgorithmForDebug,
    deleteAlgorithmForDebug,
    addPipeFromSimulator,
    execStoredPipe,
    execRawPipeline,
    deleteAlgorithmFromStore,
    insertAlgorithmToStore,
    applyAlgorithmToStore,
    deletePipelineFromStore,
    updateStoredPipeline,
    stopExecution,
    execCaching,
    cronStart,
    cronStop,
    buildStop,
    buildRerun
};