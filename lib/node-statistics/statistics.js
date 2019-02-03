// const stub = require('./stub');
const etcd = require('../etcd-data');
const INTERVAL = 1000;
//const METRICS = ['cpu', 'mem', 'gpu'];
const METRICS = ['cpu', 'mem'];
const stub = require('./stub')
class NodesStatistics {
    constructor() {
        this.currentResults = {};
        this.run();
    }
    run() {
        setTimeout(async () => {
            try {
                this.currentResults = await this.buildResults();
            } catch (error) {
                console.error(error)
            }
            this.run();
        }, INTERVAL);
    }
    getLatestResult() {
        return this.currentResults;
    }
    async buildResults() {
        const results = await Promise.all(METRICS.map(async metric => await this.buildResultsForMetrics(metric)))
        return results;
    }
    async _getEtcdData() {
       //   const taskExecutor = stub;
       const taskExecutor = await etcd._getDiscoveryType('task-executor')
        const algorithms = await etcd._getAlgorithms();
        return { taskExecutor, algorithms }
    }
    _buildAlgorithmResult(node, algorithms, metric, resourcePressure) {
        let otherAmount = 0;
        const algorithmsData = [];

        node.workers.stats.forEach(algorithm => {
            const requestedAlgorithm = algorithms.find(alg => alg.data.name === algorithm.algorithmName);
            if (requestedAlgorithm) {
                algorithmsData.push({
                    name: algorithm.algorithmName,
                    amount: algorithm.count,
                    size: +(algorithm.count * requestedAlgorithm.data[metric]).toFixed(1),
                    percentage: ((algorithm.count * requestedAlgorithm.data[metric]) / (node.total[metric]))
                })
            }
            else {
                otherAmount = otherAmount + algorithm.count;
            }
        })
        const nodeFreePercentage = ((node.total[metric] - node.requests[metric]) / (node.total[metric]));
        const nodeFree  =(node.total[metric] - node.requests[metric]);
        algorithmsData.push({
            name: 'other',
            amount: otherAmount,
            size: +(node.total[metric] *  resourcePressure -(nodeFree + (algorithmsData.reduce((sum, alg) =>  sum + alg.size, 0)))).toFixed(1),
            percentage: 1 * resourcePressure - nodeFree + (algorithmsData.reduce((sum, alg) =>  sum + alg.percentage, 0))
        })
        algorithmsData.push({
            name: 'free',
            amount: -1,
            size: +(node.total[metric] - node.requests[metric]).toFixed(1),
            percentage: nodeFreePercentage
        })
        algorithmsData.push({
            name: 'reserved',
            amount: otherAmount,
            size: (node.total[metric] * (1 - resourcePressure)).toFixed(1),
            percentage: node.total[metric] * (1 - resourcePressure) / node.total[metric]
        })
        return algorithmsData;

    }

    async buildResultsForMetrics(metric) {
        const { taskExecutor, algorithms } = await this._getEtcdData();
        const legendAlgorithms = [...algorithms.algorithms, ...algorithms.algorithmsForDebug].map(alg => alg.data.name);
        const legend = [
            ...legendAlgorithms,
            'other',
            'free',
            'reserved'

        ]
        const results = await Promise.all(taskExecutor.length?taskExecutor[0].data.nodes.map(async node => {
            const algorithmsData = await this._buildAlgorithmResult(node, [...algorithms.algorithms, ...algorithms.algorithmsForDebug], metric, taskExecutor[0].data.resourcePressure[metric]);
            return {
                name: node.name,
                algorithmsData
            }
        }):[])
        return { metric, results, legend }
    }

}

module.exports = new NodesStatistics();