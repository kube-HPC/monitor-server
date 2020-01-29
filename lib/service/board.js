const storageManager = require('@hkube/storage-manager');

const _mapBoards = (boards, key, innerKey) => {
    return (boards.length > 0) && boards.reduce((map, board) => {
        const { id, status, boardLink } = board
        map[board[key]] = map[board[key]] || {};
        map[board[key]][board[innerKey]] = { id, status, boardLink };
        return map;
    }, {}
    ) || {};
}
const mapBoards = (boards) => {

    const batch = boards.filter(board => (!board.taskId) && board.jobId);
    const batchMap = _mapBoards(batch, 'jobId', 'nodeName');
    const task = boards.filter(board => (board.taskId));
    const taskMap = (_mapBoards(task, 'jobId', 'taskId'));
    const node = boards.filter(board => (!board.jobId));
    const nodeMap = _mapBoards(node, 'pipelineName', 'nodeName');
    return { batchMap, taskMap, nodeMap };
}

const addHasMetricsToMap = async (nodeMap) => {
    const pipelines = await storageManager.hkubeAlgoMetrics.listPipelines();
    await Promise.all(pipelines.map(async pipeline => {
        nodeMap[pipeline] = nodeMap[pipeline] || {}
        const nodes = await storageManager.hkubeAlgoMetrics.listNodes(pipeline);
        await Promise.all(nodes.map(nodeName => {
            nodeMap[pipeline][nodeName] = nodeMap[pipeline][nodeName] || {}
            nodeMap[pipeline][nodeName].hasMetrics = true;
        }
        ))
    }));
}

const getBoards = ({ node, job, batchMap, taskMap }) => {
    node.boards = [];
    if (node.batch && node.batch.some(task => (task.metricsPath && task.metricsPath.tensorboard.path))) {
        hasMetrics = true;
        return batchMap[job.key] && batchMap[job.key][node.nodeName] && [{ tensorboard: { board: batchMap[job.key][node.nodeName] } }];
    }
    else {
        if (node.metricsPath && node.metricsPath.tensorboard.path) {
            hasMetrics = true;
            return taskMap[job.key] && taskMap[job.key][node.taskId] && [{ tensorboard: { board: taskMap[job.key][node.taskId] } }];
        }
    }
}


module.exports = { mapBoards, getBoards, addHasMetricsToMap };