const axios = require('axios');
const { main } = require('@hkube/config').load();
const { protocol, host, port, base_path } = main.jaeger;
const baseUri = `${protocol}://${host}:${port}/jaeger/api/traces`;
const transformData = require('./transformTraceData')
const log = require('@hkube/logger').GetLogFromContainer();
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
// axios.get(path).then(res => {

//     console.log(res.data.data[0])
//     const data = transformData(res.data.data[0])
//     console.log(data);
// })

const getTrace = async jobId => {
    const path = pathByJobID(jobId);
    try {
        const res = await axios.get(path);
        const data = transformData(res.data.data[0]);
       // console.log(data);
        return data;
    } catch (error) {
        log.error(`fail to fetch data from jaeger error:${error}`)
    }
    return {};
    // axios.get(path).then(res => {
    //     console.log(res.data.data[0])
    //     const data = transformData(res.data.data[0])
    //     console.log(data);
    // })

}
const pathByJobID = jobId => `${baseUri}?service=api-server&tags={"jobId":"${jobId}"}`


module.exports = {
    getTrace
}