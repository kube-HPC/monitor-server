
const etcd = require('./etcd-data')
const lastRun = null;
const getExecutions = () => {
    setTimeout(async() => {
        await _get();
        getExecutions();
    }, 100000);
}


const _get = async () => { 
    const res= await etcd._getExecutions(1000);
};

const init = () => {
    getExecutions();

}


module.exports = init;
