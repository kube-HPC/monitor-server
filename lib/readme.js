const request = require('requestretry');
const req = require('request');
const {main} = require('@hkube/config').load();
const {protocol,host,port,base_path} = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;
const log = require('@hkube/logger').GetLogFromContainer();
const _retrySettings = {
    maxAttempts: 5,
    retryDelay: 5000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
};


const get = ({name,type}) => {
    const path = `readme/${type}/${name}`;
    const uri = `${baseUri}/${path}`
    log.info(`sending request for getting readme  from ${type} with ${name} to the following uri ${uri}`, {
        component: 'api-server'
    })

    return request({
        method: 'GET',
        uri,
        ..._retrySettings
    });
}

const post =async  ({name,type,data}) => {

    const formData = {
        'README.md': {
            value:  Buffer.from(data),
            options: {
              filename: "README.md",
            }
    }
}
    const path = `readme/${type}/${name}`;
    const url = `${baseUri}/${path}`
    log.info(`sending request for getting readme  from ${type} with ${name} to the following uri ${url}`, {
        component: 'api-server'
    })
//    const r =  req.post({url,formData
       
//     },(err, httpResponse, body)=> {
//         if (err) {
//           return console.error('upload failed:', err);
//         }
//     })


    // const form = r.form();
    // form.append('data',Buffer.from(data),{filename:"README.md"})
    return  request.post({url,formData});

}




module.exports = {
    getReadme:get,
    postReadme:post
}