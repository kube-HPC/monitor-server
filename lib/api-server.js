const request = require('requestretry');
const  { main } = require('@hkube/config').load();
const { protocol, host, port,base_path } = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;
const _retrySettings = {
    maxAttempts: 5,
    retryDelay: 5000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
};

    
const addAlgorithmForDebug = ({algorithmName})=>{
    const path =`store/algorithms/debug`;
 //   const baseUri  = `https://40.69.222.75/hkube/api-server/${base_path}`
    const uri = `${baseUri}/${path}`
    
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

module.exports = {
    addAlgorithmForDebug,
    deleteAlgorithmForDebug
};