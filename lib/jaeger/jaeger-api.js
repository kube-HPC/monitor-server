const request = require('request');
const { main } = require('@hkube/config').load();
const { protocol, host, port } = main.jaeger;
const baseUri = `${protocol}://${host}:${port}/jaeger/api/traces`;
const transformData = require('./transformTraceData')
const log = require('@hkube/logger').GetLogFromContainer();

const _request = (options) => {
    return new Promise((resolve, reject) => {
        request({
            ...options,
            json: true
        }, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            return resolve(body);
        });
    });
}

const getTrace = async jobId => {
    const uri = pathByJobID(jobId);
    try {
        const res = await _request({ uri, method: 'GET', rejectUnauthorized: false });
        const data = transformData(res.data[0]);
        return data;
    }
    catch (error) {
        log.warning(`fail to fetch data from jaeger error:${error}`)
    }
    return {};
}
const pathByJobID = jobId => `${baseUri}?service=api-server&tags={"jobId":"${jobId}"}`

module.exports = {
    getTrace
}