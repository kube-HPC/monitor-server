require("express-async-errors");
const http = require("http");
const path = require("path");
const Logger = require("@hkube/logger");
const storageManager = require("@hkube/storage-manager");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require('compression');
const proxy = require('http-proxy-middleware');
const express = require("express");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    pingTimeout: 25000,
    maxHttpBufferSize: 5e7,
    transports: ['websocket'],
});
const CONSTS = require("../consts/consts");
const etcdApi = require("./etcd-data");
const resultGather = require("./result-gather");
const { pipeTrace } = require("../jaeger/jaeger-api");
const logs = require("../task-logs/logs");
const errors = require("../middlewares/errors");
const redisAdapter = require('./redis-storage-adapter');
const errorResponse = require('../utils/error-response');
let log;
let routes;

const filterProxyPaths = (path) => {
    return !routes.find(p => path.startsWith(p));
};

const enableResultGather = () => {
    const clients = totalClients();
    resultGather.enable(clients > 0);
};

const totalClients = () => {
    return Object.keys(io.sockets.sockets).length;
}

const serverInit = async options => {
    log = Logger.GetLogFromContainer();

    const { protocol, host, port, base_path } = options.apiServer;
    const baseUri = `${protocol}://${host}:${port}/${base_path}`;

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

    const apiProxy = proxy(filterProxyPaths, proxyOptions);

    io.on("connection", socket => {
        enableResultGather();
        socket.on("disconnect", (reason) => {
            enableResultGather();
            log.info(`client disconnected, reason: ${reason}, total: ${totalClients()}`);
        });
        log.info(`client connected, total: ${totalClients()}`);
    });
    resultGather.on("result", res => {
        io.emit(CONSTS.progress, res);
    });

    app.use(compression());
    app.use((req, res, next) => {
        const { url, method } = req;
        log.info(`${method} client request for ${url}`);
        next();
    });
    app.use(cors());
    app.use(apiProxy);
    app.use(bodyParser.json());

    app.get("/logs/set", (req, res) => {
        logs.updateFormat(req.query.format);
        logs.updateContainer(req.query.container);
        logs.updateSource(req.query.source);
        const { settings, options } = logs;
        res.json({ settings, options });
    });
    app.get("/logs", async (req, res) => {
        const data = await logs.getLogs(req.query.taskId, req.query.podName);
        return res.json(data);
    });
    app.post("/webhook/result", (req, res) => {
        etcdApi.addWebhook(req.body);
        res.json({
            message: 'OK'
        });
    });
    app.post("/webhook/progress", (req, res) => {
        etcdApi.addWebhook(req.body);
        res.json({
            message: 'OK'
        });
    });
    app.get("/jaeger", async (req, res) => {
        await pipeTrace(req.query.jobId, res);
    });
    app.get("/download/results", async (req, res) => {
        const readStream = await storageManager.getStream({ path: req.query.path });
        res.set("Content-disposition", "attachment; filename=results.json");
        res.set("Content-Type", "application/json");
        readStream.pipe(res);
    });
    app.get("/versions.html", (req, res) => {
        res.sendFile(path.join("/", "versions", "versions.html"));
    });
    app.get("/versions.json", (req, res) => {
        res.sendFile(path.join("/", "versions", "versions.json"));
    });
    app.get("/pods/:jobId", async (req, res) => {
        const data = await etcdApi.getPodsByJobId(req.params.jobId);
        res.json(data);
    });
    app.get('/redislogs/delete', async (req, res) => {
        const response = await redisAdapter.deleteLogs()
        res.json({ response });
    });
    app.use(errors);
    app.use((err, req, res, next) => {
        const { error, status, message } = err;
        const { url, method } = req;
        log.error(`${method} error response, url=${url} status=${status}, message=${message || error.message}`);
    });

    routes = app._router.stack
        .filter(r => r.route && r.route.path)
        .map(r => {
            let path = r.route.path;
            const index = path.indexOf(':');
            if (index !== -1) {
                path = path.substring(0, index);
            }
            return path;
        });

    return new Promise((resolve, reject) => {
        server.listen(options.rest.port, () => {
            log.info("Rest server is listening on port " + options.rest.port);
            resolve();
        });
    });
};

module.exports = serverInit;