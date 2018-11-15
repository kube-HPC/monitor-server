const request = require('requestretry');
const  { main } = require('@hkube/config').load();
const { protocol, host, port,base_path } = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;
const log = require('@hkube/logger').GetLogFromContainer();

const _retrySettings = {
    maxAttempts: 5,
    retryDelay: 5000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
};

const addAlgorithmForDebug = ({algorithmName})=>{
    const path =`store/algorithms/debug`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for adding new algorithm with name ${algorithmName} to the following uri ${uri}`,{component:'api-server'})
    
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
        json: true,
        ..._retrySettings
    });
}

const insertAlgorithmToStore = ({algorithm})=>{
    const path =`store/algorithms`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for adding algorithm with name ${algorithm.name} to the following uri ${uri}`,{component:'api-server'})
    
    return request({
        method: 'POST',
        uri,
        body: algorithm,
        json: true,
        ..._retrySettings
    });
}
const deleteAlgorithmForDebug = (algorithmName)=>{
    const path =`store/algorithms/debug/${algorithmName}`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for deleting new algorithm with name ${algorithmName} to the following uri ${uri}`,{component:'api-server'})
    
    return request({
        method: 'Delete',
        uri,
        json: true,
        ..._retrySettings
    });
}
const deleteAlgorithmFromStore = (algorithmName)=>{
    const path =`store/algorithms/${algorithmName}`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for deleting algorithm=${algorithmName} from store, to the following uri ${uri}`,{component:'api-server'})

    return request({
        method: 'Delete',
        uri,
        json: true,
        ..._retrySettings
    });
}

const deletePipelineFromStore = (pipelineName)=>{
    const path =`store/pipelines/${pipelineName}`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for deleting pipeline=${pipelineName} from store, to the following uri ${uri}`,{component:'api-server'})

    return request({
        method: 'Delete',
        uri,
        json: true,
        ..._retrySettings
    });
}

const addPipeFromSimulator = ({pipe})=>{
    const path =`store/pipelines`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post request with path=${path} for adding pipe=${pipe.name} from simulator`);

    return request({
        method: 'POST',
        uri,
        body: pipe,
        json: true,
        ..._retrySettings
    });
}

const stopExecution = (pipe)=>{
    const path =`exec/stop`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post request with path=${path} for stopping pipe=${pipe}`);

    return request({
        method: 'POST',
        uri,
        body: {
            'jobId': pipe,
            'reason': 'Request from simulator, Algorithms-tab Delete action'
            },
        json: true,
        ..._retrySettings
    });
}

const execStoredPipe = ({pipe})=>{
    const path =`exec/stored`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post request with path=${path} for execution stored pipe=${pipe.name} from simulator`);

    return request({
        method: 'POST',
        uri,
        body: pipe,
        json: true,
        ..._retrySettings
    });
}

module.exports = {
    addAlgorithmForDebug,
    deleteAlgorithmForDebug,
    addPipeFromSimulator,
    execStoredPipe,
    deleteAlgorithmFromStore,
    insertAlgorithmToStore,
    deletePipelineFromStore,
    stopExecution
};