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
//   const baseUri  = `https://40.69.222.75/hkube/api-server/${base_path}`
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
const deleteAlgorithmForDebug = (algorithmName)=>{
    const path =`store/algorithms/debug/${algorithmName}`;
//   const baseUri  = `https://40.69.222.75/hkube/api-server/${base_path}`
    const uri = `${baseUri}/${path}`
    log.info(`sending request for deleting new algorithm with name ${algorithmName} to the following uri ${uri}`,{component:'api-server'})
    
    return request({
        method: 'Delete',
        uri,
        // body: {
        //     name: algorithmName,
        //     algorithmImage: algorithmName,
        //     cpu: 1,
        //     mem: "256 Mi",
        //     options: {
        //         debug: true
        //     }
        // },
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

const getStoredPipes = ()=>{
    const path =`store/pipelines`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending get request with path=${path} for getting all stored pipes`);

    return request({
        method: 'GET',
        uri,
        json: true,
        ..._retrySettings
    });
}

module.exports = {
    addAlgorithmForDebug,
    deleteAlgorithmForDebug,
    addPipeFromSimulator,
    getStoredPipes,
};