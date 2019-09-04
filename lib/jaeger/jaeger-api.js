const request = require('request');
const { main } = require('@hkube/config').load();
const { protocol, host, port } = main.jaeger;
const baseUri = `${protocol}://${host}:${port}/jaeger/api/traces`;

const pipeTrace = async (req, res) => {
    return new Promise((resolve, reject) => {
        const url = pathByJobID(req.query.jobId);
        const response = request({ url, method: 'GET', rejectUnauthorized: false })
        response.on('response', r => resolve(r)).on('error', e => reject(e));
        req.pipe(response).pipe(res);
    });
}

const pathByJobID = jobId => `${baseUri}?service=api-server&tags={"jobId":"${jobId}"}`

module.exports = {
    pipeTrace
}