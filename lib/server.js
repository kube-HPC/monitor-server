require("express-async-errors");
const bodyParser = require("body-parser");
const path = require("path");
const fse = require('fs-extra');
const app = require("express")();
const multer = require("multer");
const cors = require("cors");
const http = require("http");
const stream = require("stream");
const server = require("http").Server(app);
const io = require("socket.io")(server);
const CONSTS = require("./consts");
const etcdApi = require("./etcd-data");
const resultGather = require("./result-gather");
const { getTrace } = require("./jaeger/jaeger-api");
const kubernetesLogs = require("./kubernetes/logs");
const storageManager = require("@hkube/storage-manager");
const Logger = require("@hkube/logger");
const delay = require("await-delay");
const errors = require("./middlewares/errors");
const upload = multer({ dest: "uploads/zipped/" });

const {
    getReadme,
    postReadme,
    addAlgorithmForDebug,
    deleteAlgorithmForDebug,
    addPipeFromSimulator,
    execStoredPipe,
    execRawPipeline,
    deleteAlgorithmFromStore,
    insertAlgorithmToStore,
    applyAlgorithmToStore,
    updateStoredPipeline,
    deletePipelineFromStore,
    stopExecution,
    execCaching,
    cronStart,
    cronStop,
    buildStop,
    buildRerun
} = require("./api-server");

let log;
const httpCode = "200";

const enableResultGather = () => {
    const clients = Object.keys(io.sockets.sockets);
    resultGather.enable(clients.length > 0);
};

const serverInit = async options => {
    log = Logger.GetLogFromContainer();
    const httpCodes = Object.keys(http.STATUS_CODES);
    io.on("connection", socket => {
        enableResultGather();
        socket.on("disconnect", () => {
            enableResultGather();
            log.info("disconnect!!!");
        });
        log.info("connection!!!");
    });

    resultGather.on("result", res => {
        io.emit(CONSTS.progress, res);
    });

    app.use((req, res, next) => {
        const { url, method } = req;
        log.info(`${method} client request for ${url}`);
        next();
    });
    app.use(bodyParser.json());
    app.use(cors());

    app.post("/webhook/result", (req, res) => {
        etcdApi.addWebhook(req.body);
        res.json({
            message: httpCodes[httpCode]
        });
    });
    app.post("/webhook/progress", async (req, res) => {
        etcdApi.addWebhook(req.body);
        res.json({
            message: httpCodes[httpCode]
        });
    });
    app.get("/config", (req, res) => {
        res.json({
            //  socketPort: config.port
        });
    });
    app.get("/kubernetes/logs", async (req, res) => {
        const data = await kubernetesLogs.getLogs(req.query.podName);
        return res.json(data);
    });
    app.get("/jaeger", async (req, res) => {
        const data = await getTrace(req.query.jobId);
        return res.json({ [`${req.query.jobId}`]: data });
    });
    app.post("/pipeline/add", async (req, res) => {
        const data = await addPipeFromSimulator(req.body);
        res.json(data);
    });
    app.post("/exec/stop", async (req, res) => {
        const data = await stopExecution(req.body.jobId);
        res.json(data);
    });
    app.post("/exec/stored", async (req, res) => {
        const data = await execStoredPipe(req.body);
        res.json(data);
    });
    app.post("/exec/raw", async (req, res) => {
        const data = await execRawPipeline(req.body);
        res.json(data);
    });
    app.post("/exec/caching", async (req, res) => {
        const data = await execCaching(req.body);
        res.json(data);
    });
    app.put("/store/pipelines", async (req, res) => {
        const data = await updateStoredPipeline(req.body);
        res.json(data);
    });
    app.post("/store/algorithms", async (req, res) => {
        const data = await insertAlgorithmToStore(req.body.algorithm);
        res.json(data);
    });
    app.post("/store/algorithms/apply", upload.single("file"), async (req, res) => {
        try {
            let payload = req.body.payload;
            if (req.file) {
                const pay = JSON.parse(payload);
                const env = { WORKER_ALGORITHM_PROTOCOL: "ws" };
                pay.workerEnv = env;
                pay.algorithmEnv = env;
                payload = JSON.stringify(pay);
            }
            const data = await applyAlgorithmToStore({
                payload,
                file: req.file
            });
            res.json(data);
        }
        finally {
            if (req.file && req.file.path) {
                await fse.remove(req.file.path);
            }
        }
    });
    app.post("/store/algorithms", async (req, res) => {
        const data = await insertAlgorithmToStore(req.body);
        res.json(data);
    });
    app.delete("/store/algorithms/:algorithmName", async (req, res) => {
        log.info(`delete request for existing algorithm at store`);
        let apiRes = null;
        apiRes = await deleteAlgorithmFromStore(req.params.algorithmName);
        if (apiRes.statusCode === 400) {
            const { pipelines, executions } = apiRes.body.error.details;

            for (const p of pipelines) {
                await delay(500);
                await deletePipelineFromStore(p);
            }
            for (const e of executions) {
                await delay(500);
                await stopExecution(e);
            }
            apiRes = await deleteAlgorithmFromStore(req.params.algorithmName);
            res.json({ apiRes });
        }
    });
    app.delete("/store/pipelines/:pipelineName", async (req, res) => {
        const data = await deletePipelineFromStore(req.body.pipelineName);
        res.json(data);
    });
    app.post("/cron/start", async (req, res) => {
        const data = await cronStart(req.body);
        res.json(data);
    });
    app.post("/cron/stop", async (req, res) => {
        const data = await cronStop(req.body);
        res.json(data);
    });
    app.post("/debug/add", async (req, res) => {
        const data = await addAlgorithmForDebug(req.body);
        res.json(data);
    });
    app.delete("/debug/delete/:algorithmName", async (req, res) => {
        const data = await deleteAlgorithmForDebug(req.params.algorithmName);
        res.json(data);
    });
    app.get("/download/results", async (req, res) => {
        const readStream = await storageManager.getStream({ path: req.query.path });
        res.set("Content-disposition", "attachment; filename=results.json");
        res.set("Content-Type", "application/json");
        readStream.pipe(res);
    });
    app.post("/builds/stop", async (req, res) => {
        const { buildId } = req.body;
        const data = await buildStop({ buildId });
        res.json(data);
    });
    app.post("/builds/rerun", async (req, res) => {
        const { buildId } = req.body;
        const data = await buildRerun({ buildId });
        res.json(data);
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
    app.get('/readme/algorithms/:name', async (req, res) => {
        const response = await getReadme({ name: req.params.name, type: 'algorithms' })
        const readme = response.readme || '';
        res.json({ name: req.params.name, readme });
    });
    app.post('/readme/algorithms/:name', async (req, res) => {
        const response = await postReadme({ name: req.body.name, type: 'algorithms', data: req.body.readme })
        res.json({ name: req.params.name, readme });
    });
    app.get('/readme/pipelines/:name', async (req, res) => {
        const response = await getReadme({ name: req.params.name, type: 'pipelines' })
        const readme = response.readme || '';
        res.json({ name: req.params.name, readme });
    });
    app.post('/readme/pipelines/:name', async (req, res) => {
        const response = await postReadme({ name: req.body.name, type: 'pipelines', data: req.body.readme })
        res.json({ name: req.params.name, readme: req.body.readme });
    })
    app.use(errors);
    app.use((err, req, res, next) => {
        const { error, status, message } = err;
        const { url, method } = req;
        log.error(`${method} error response, url=${url} status=${status}, message=${message || error.message}`);
    });

    return new Promise((resolve, reject) => {
        server.listen(options.rest.port, () => {
            log.info("Rest server is listening on port " + options.rest.port);
            resolve();
        });
    });
};

module.exports = serverInit;
