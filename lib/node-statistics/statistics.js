
const etcd = require('../etcd-data');
const INTERVAL = 10000;
const METRICS = ['cpu', 'mem'];

class NodesStatistics {
    constructor() {
        this.currentResults = {};
        this.run();
    }

    run() {
        setTimeout(async () => {
            try {
                const data = await this._getEtcdData();
                this.currentResults = await this.buildResults(data);
            }
            catch (error) {
                console.error(error)
            }
            this.run();
        }, INTERVAL);
    }

    getLatestResult() {
        return this.currentResults;
    }

    async buildResults(data) {
        const results = await Promise.all(METRICS.map(metric => this.buildResultsForMetrics(metric, data)))
        return results;
    }

    async _getEtcdData() {
        const taskExecutor = await etcd._getDiscoveryType('task-executor')
        const algorithms = await etcd._getAlgorithms();
        return { taskExecutor, algorithms }
    }

    _buildAlgorithmResult(node, algorithms, metric, resourcePressure) {
        let otherAmount = 0;
        const algorithmsData = [];

        node.workers.stats.forEach(algorithm => {
            const requestedAlgorithm = algorithms.find(alg => alg.name === algorithm.algorithmName);
            if (requestedAlgorithm) {
                algorithmsData.push({
                    name: algorithm.algorithmName,
                    amount: algorithm.count,
                    size: +(algorithm.count * requestedAlgorithm[metric]).toFixed(1),
                })
            }
            else {
                otherAmount = otherAmount + algorithm.count;
            }
        })
        algorithmsData.push({
            name: 'other',
            amount: otherAmount,
            // size: +(node.total[metric] *  resourcePressure -(nodeFree + (algorithmsData.reduce((sum, alg) =>  sum + alg.size, 0)))).toFixed(1),
            size: +(node.other[metric].toFixed(1)),
        })
        const free = node.total[metric] * resourcePressure - node.requests[metric];
        algorithmsData.push({
            name: 'free',
            amount: -1,
            size: +(free < 0 ? 0 : free).toFixed(1),
        })
        algorithmsData.push({
            name: 'reserved',
            amount: otherAmount,
            size: +(node.total[metric] * (1 - resourcePressure) + (free < 0 ? free : 0)).toFixed(1),
        })
        return algorithmsData;
    }

    async buildResultsForMetrics(metric, { taskExecutor, algorithms }) {
        const legendAlgorithms = [...algorithms.algorithms, ...algorithms.algorithmsForDebug].map(alg => alg.name);
        const legend = [
            ...legendAlgorithms,
            'other',
            'free',
            'reserved'
        ]
        const results = taskExecutor.length && taskExecutor[0].nodes.map(node => {
            const algorithmsData = this._buildAlgorithmResult(node, [...algorithms.algorithms, ...algorithms.algorithmsForDebug], metric, taskExecutor[0].resourcePressure[metric]);
            return {
                name: node.name,
                algorithmsData
            }
        });
        return { metric, results, legend }
    }
}

module.exports = new NodesStatistics();