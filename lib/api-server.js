const request = require('requestretry');
const {main} = require('@hkube/config').load();
const {protocol,host,port,base_path} = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;
const log = require('@hkube/logger').GetLogFromContainer();

const _retrySettings = {
    maxAttempts: 5,
    retryDelay: 5000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
};

const addAlgorithmForDebug = ({algorithmName}) => {
    const path = `store/algorithms/debug`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for adding new algorithm with name ${algorithmName} to the following uri ${uri}`, {
        component: 'api-server'
    })

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

const insertAlgorithmToStore = ({algorithm}) => {
    const path = `store/algorithms`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for adding algorithm with name=${algorithm.name} to the following uri ${uri}`, {
        component: 'api-server'
    })

    return request({
        method: 'POST',
        uri,
        body: algorithm,
        json: true,
        ..._retrySettings
    });
}
const deleteAlgorithmForDebug = (algorithmName) => {
    const path = `store/algorithms/debug/${algorithmName}`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for deleting new algorithm with name ${algorithmName} to the following uri ${uri}`, {
        component: 'api-server'
    })

    return request({
        method: 'Delete',
        uri,
        json: true,
        ..._retrySettings
    });
}
const deleteAlgorithmFromStore = (algorithmName) => {
    return new Promise((resolve, reject) => {
        const path = `store/algorithms/${algorithmName}`;
        const uri = `${baseUri}/${path}`
        log.info(`sending request for deleting algorithm=${algorithmName} from store, to the following uri ${uri}`, {
            component: 'api-server'
        })

        request({
            method: 'Delete',
            uri,
            json: true,
            ..._retrySettings
        }).then(res=>{resolve(res);}).catch(err => {
            log.error(`error on deleteAlgorithmFromStore  ${err}`)
            reject(err);
        })
    })
}

const deletePipelineFromStore = (pipelineName) => {
    return new Promise((resolve, reject) => {
        const path = `store/pipelines/${pipelineName}`;
        const uri = `${baseUri}/${path}`
        log.info(`sending request for deleting pipeline=${pipelineName} from store, to the following uri ${uri}`, {component: 'api-server'})
        
        request({
            method: 'Delete',
            uri,
            json: true,
            ..._retrySettings
        }).then(res => {
            log.info(`deletePipelineFromStore result statusCode=${JSON.stringify(res.statusCode)}, message=${JSON.stringify(res.body.message)}`, {
                component: 'api-server'
            })
            if (res.statusCode === 200) {
                resolve(res);
            }
        }).catch(err => {
            log.error(`error on deletePipelineFromStore  ${err}`)
            reject(err);
        })
    });

}

const addPipeFromSimulator = ({pipe}) => {
    const path = `store/pipelines`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post request with path=${path} for adding pipe=${pipe.name} from simulator`, {
        component: 'api-server'
    });

    return request({
        method: 'POST',
        uri,
        body: pipe,
        json: true,
        ..._retrySettings
    });
}

const stopExecution = (pipe) => {
    return new Promise((resolve, reject) => {

        const path = `exec/stop`;
        const uri = `${baseUri}/${path}`;
        log.info(`sending post request with path=${path} for stopping pipe=${pipe}`, {
            component: 'api-server'
        });

        request({
            method: 'POST',
            uri,
            body: {
                'jobId': pipe,
                'reason': 'Request from simulator, Algorithms-tab Delete action'
            },
            json: true,
            ..._retrySettings
        }).then(res => {
            log.info(`result stopExecution  ${JSON.stringify(res)}`, {
                component: 'api-server'
            })
            if (res.statusCode === 200) {
                resolve(res);
            }
        }).catch(err => {
            log.error(`error on stopExecution  ${err}`)
            reject(err);
        })

    });

}

const execRawPipeline = (pipeline) => {
    const path = `exec/raw`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post  for execution raw pipe=${pipeline.name} `, {
        component: 'api-server'
    });

    return request({
        method: 'POST',
        uri,
        body: pipeline,
        json: true,
        ..._retrySettings
    });
}
const execCaching = ({jobId,nodeName}) => {
    const path = `exec/caching`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post request for caching with path=${path} for caching jobId=${jobId} from simulator`, {
        component: 'api-server'
    });

    return request({
        method: 'POST',
        uri,
        body: {jobId,nodeName},
        json: true,
        ..._retrySettings
    });
}


const execStoredPipe = ({pipe}) => {
    const path = `exec/stored`;
    const uri = `${baseUri}/${path}`;
    log.info(`sending post request with path=${path} for execution stored pipe=${pipe.name} from simulator`, {
        component: 'api-server'
    });

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
    execRawPipeline,
    deleteAlgorithmFromStore,
    insertAlgorithmToStore,
    deletePipelineFromStore,
    stopExecution,
    execCaching
};