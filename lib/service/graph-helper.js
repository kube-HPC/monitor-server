const Events = require('events');
const clone = require('clone');
const objectPath = require('object-path');
const flatten = require('flat');
const etcdApi = require('./etcd-data');
const board = require('./board');

class GraphHelper extends Events {
    init(options) {
        this._options = options;
    }

    async cleanGraph(jobs, taskMap, batchMap) {
        return Promise.all(jobs.map(async j => {
            const { key: jobId, graph } = j;
            if (graph) {
                await Promise.all(graph.nodes.map(async (n, i) => {
                    const tasks = await etcdApi.getTasks({
                        jobId,
                        nodeName: n.nodeName,
                        sort: { error: 'desc', warnings: 'desc' },
                        limit: this._options.graph.maxBatchSize
                    });
                    if (!tasks?.length) {
                        return;
                    }
                    if (n.batchInfo) {
                        n.batch = tasks.map(b => this._mapTask(b));
                        n.batch = this._selectBatch(n.batch);
                    }
                    else {
                        const task = this._mapTask(tasks[0]); // eslint-disable-line
                        graph.nodes[i] = { ...task, ...n };
                        graph.nodes[i].input = this._trimArrays(task.input);
                        graph.nodes[i].output = this._trimArrays(task.output);
                    }
                    n.boards = board.getBoards({ node: n, job: j, taskMap, batchMap });
                }));

                if (!this._options.graph.enableStreamingMetrics) {
                    graph.edges.forEach(e => {
                        if (e.value?.metrics) {
                            delete e.value.metrics;
                        }
                    });
                }
            }
            return { ...j, graph };
        }));
    }

    _mapTask(task) {
        return {
            taskId: task.taskId,
            input: this._parseInput(task),
            output: task.result,
            podName: task.podName,
            status: task.status,
            error: task.error,
            warnings: task.warnings,
            retries: task.retries,
            batchIndex: task.batchIndex,
            startTime: task.startTime,
            endTime: task.endTime,
            metricsPath: task.metricsPath,
            level: task.level
        };
    }

    _trimArrays(array, count = 10) {
        let res = array;
        if (Array.isArray(array)) {
            res = array.slice(0, count);
            for (let i = 0; i < res.length; i += 1) {
                res[i] = this._trimArrays(res[i]);
            }
        }
        return res;
    }

    _selectBatch(batch) {
        if (!batch) {
            return [];
        }
        for (let i = 0; i < batch.length; i += 1) {
            batch[i].input = this._trimArrays(batch[i].input);
        }
        return batch;
    }

    _parseInput(node) {
        if (!node.input) {
            return null;
        }
        const result = clone(node.input);
        const flatObj = flatten(node.input);

        Object.entries(flatObj).forEach(([k, v]) => {
            if (typeof v === 'string' && v.startsWith('$$')) {
                const key = v.substring(2);
                const storage = node.storage?.[key];
                let input;
                if (Array.isArray(storage)) {
                    input = { type: 'array', size: storage.flatMap(a => a.tasks).length };
                }
                else {
                    input = storage?.storageInfo;
                }
                objectPath.set(result, k, input);
            }
        });
        return result;
    }
}

module.exports = new GraphHelper();
