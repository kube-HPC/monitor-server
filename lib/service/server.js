require('express-async-errors');
const http = require('http');
const pathLib = require('path');
const Logger = require('@hkube/logger');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
    pingTimeout: 25000,
    maxHttpBufferSize: 5e7,
    transports: ['websocket'],
});
const CONSTS = require('../consts/consts');
const etcdApi = require('./etcd-data');
const resultGather = require('./result-gather');
const { pipeTrace } = require('../jaeger/jaeger-api');
const logs = require('../task-logs/logs');
const errors = require('../middlewares/errors');
const redisAdapter = require('./redis-storage-adapter');
const errorResponse = require('../utils/error-response');
let log;
let routes;

const filterProxyPaths = (path) => {
    return !routes.find(p => path.startsWith(p));
};

const totalClients = () => {
    return Object.keys(io.sockets.sockets).length;
};

const enableResultGather = () => {
    const clients = totalClients();
    resultGather.enable(clients > 0);
};

const roomRegister = (name, socket) => {
    socket.join(name);
    resultGather.experimentRegister(name.split('experiment:')[1]);
};

const roomLeave = (data, socket) => {
    data && socket.leave(data);
};

const clearRoomsInterval = () => {
    setInterval(() => {
        const rooms = Object.keys(io.sockets.adapter.rooms);
        const clearedRooms = resultGather.experiments.filter(exp => !rooms.find(rm => exp === rm.split('experiment:')[1] && rm.match('experiment:')));
        clearedRooms.forEach(rm => resultGather.experimentUnregister(rm));
    }, 10000);
};

const serverInit = async options => {
    log = Logger.GetLogFromContainer();

    const { protocol, host, port, basePath } = options.apiServer;
    const baseUri = `${protocol}://${host}:${port}/${basePath}`;

    const proxyOptions = {
        target: baseUri,
        changeOrigin: true,
        onError: (err, req, res) => {
            const response = errorResponse(err);
            const status = response.code;
            res.status(status);
            res.json({ error: response });
        }
    };

    const apiProxy = createProxyMiddleware(filterProxyPaths, proxyOptions);

    const { datasourceService, pipelineDriversQueue } = options;
    const dataSourceProxy = createProxyMiddleware('/datasource', {
        target: `${datasourceService.protocol}://${datasourceService.host}:${datasourceService.port}/api/v1`,
        changeOrigin: true,
    });

    const pipelineDriverQueueProxy = createProxyMiddleware('/queue', {
        target: `${pipelineDriversQueue.protocol}://${pipelineDriversQueue.host}:${pipelineDriversQueue.port}/api/v1`,
        changeOrigin: true,
    });

    io.on('connection', socket => {
        enableResultGather();
        socket.on('disconnect', (reason) => {
            enableResultGather();
            log.info(`client disconnected, reason: ${reason}, total: ${totalClients()}`);
        });
        log.info(`client connected,1 total: ${totalClients()}`);
        socket.on('experiment-register', ({ name = 'experiment:main', lastRoom }) => {
            if (lastRoom === name && Object.keys(socket.rooms).includes(name)) {
                return;
            }
            roomLeave(lastRoom, socket);
            roomRegister(name, socket);
        });
    });
    resultGather.on('result', res => {
        res.jobs.forEach(job => {
            io.to(`experiment:${job.experimentName}`).emit(CONSTS.progress, { ...res, jobs: job.jobs, meta: { experimentName: job.experimentName } });
        });
        //   io.emit(CONSTS.progress, res);
    });

    app.use(compression());
    app.use((req, res, next) => {
        const { url, method } = req;
        log.info(`${method} client request for ${url}`);
        next();
    });
    app.use(cors());
    app.use(dataSourceProxy);
    app.use(pipelineDriverQueueProxy);
    app.use(apiProxy);
    app.use(bodyParser.json());

    app.get('/logs/set', (req, res) => {
        const { source, format } = req.query;
        logs.updateSource(source);
        logs.updateFormat(format);
        const { settings } = logs;
        res.json({ settings });
    });
    app.get('/logs', async (req, res) => {
        const { taskId, podName, source, nodeKind, logMode, pageNum, sort, limit } = req.query;
        const data = await logs.getLogs({ taskId, podName, source, nodeKind, logMode, pageNum, sort, limit });
        return res.json(data);
    });
    app.get('/jaeger', async (req, res) => {
        await pipeTrace(req.query.jobId, res);
    });
    app.get('/versions.html', (req, res) => {
        res.sendFile(pathLib.join('/', 'versions', 'versions.html'));
    });
    app.get('/versions.json', (req, res) => {
        res.sendFile(pathLib.join('/', 'versions', 'versions.json'));
    });
    app.get('/pods/:jobId', async (req, res) => {
        const data = await etcdApi.getPodsByJobId(req.params.jobId);
        res.json(data);
    });
    app.get('/flowInput/:jobId', async (req, res) => {
        const data = await etcdApi.getFlowInputByJobId(req.params.jobId);
        if (data) {
            if (req.query.download) {
                res.setHeader('Content-Disposition', 'attachment;filename="flowInput.json"');
            }
            res.json(data);
        }
        else {
            res.status(404).end();
        }
    });
    app.get('/redislogs/delete', async (req, res) => {
        const response = await redisAdapter.deleteLogs();
        res.json({ response });
    });
    app.use(errors);
    app.use((err, req) => {
        const { error, status, message } = err;
        const { url, method } = req;
        log.error(`${method} error response, url=${url} status=${status}, message=${message || error.message}`);
    });

    routes = app._router.stack
        .filter(r => r.route && r.route.path)
        .map(r => {
            let { path } = r.route;
            const index = path.indexOf(':');
            if (index !== -1) {
                path = path.substring(0, index);
            }
            return path;
        });

    return new Promise((resolve) => {
        server.listen(options.rest.port, () => {
            log.info(`Rest server is listening on port ${options.rest.port}`);
            clearRoomsInterval();
            resolve();
        });
    });
};

module.exports = serverInit;
