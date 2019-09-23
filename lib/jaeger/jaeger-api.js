const request = require('request');
const { main } = require('@hkube/config').load();
const { protocol, host, port } = main.jaeger;
const baseUri = `${protocol}://${host}:${port}/jaeger/api/traces`;

const pipeTrace = async (jobId, res) => {
    return new Promise((resolve, reject) => {
        const url = pathByJobID(jobId);
        const req = request({ url, rejectUnauthorized: false });
        req.on('response', resolve).on('error', reject);
        req.pipe(res);
    });
}

const pathByJobID = jobId => `${baseUri}?service=api-server&tags={"jobId":"${jobId}"}`

module.exports = {
    pipeTrace
}