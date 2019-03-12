const bodyParser = require('body-parser');
const path = require('path')
const app = require('express')();
const multer = require('multer');
const cors = require('cors')
const http = require('http')
const stream = require('stream');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const CONSTS = require('./consts');
const etcdApi = require('./etcd-data');
const resultGather = require('./result-gather');
const { getTrace } = require('./jaeger/jaeger-api');
const kubernetesLogs = require('./kubernetes/logs')
const storageManager = require('@hkube/storage-manager');
const Logger = require('@hkube/logger');
const delay = require('await-delay');
const errors = require('./middlewares/errors');
const upload = multer({ dest: 'uploads/zipped/' });

const {
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
} = require('./api-server')

let log;
const httpCode = '200';

const enableResultGather = () => {
    const clients = Object.keys(io.sockets.sockets);
    resultGather.enable(clients.length > 0);
}

const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const serverInit = async (options) => {
    log = Logger.GetLogFromContainer();
    const httpCodes = Object.keys(http.STATUS_CODES);
    io.on('connection', (socket) => {
        enableResultGather();
        socket.on('disconnect', () => {
            enableResultGather();
            log.info('disconnect!!!');
        });
        log.info('connection!!!');
    })

    resultGather.on('result', (res) => {
        io.emit(CONSTS.progress, res);
    })

    app.use((req, res, next) => {
        const { url, method } = req;
        log.info(`${method} client request for ${url}`);
        next();
    });
    app.use(bodyParser.json());
    app.use(cors())

    app.post('/webhook/result', (req, res, next) => {
        etcdApi.addWebhook(req.body);
        res.json({
            message: httpCodes[httpCode]
        });
    })
    app.post('/webhook/progress', async (req, res, next) => {
        etcdApi.addWebhook(req.body);
        res.json({
            message: httpCodes[httpCode]
        });
    })
    app.get('/config', (req, res, next) => {
        res.json({
            //  socketPort: config.port
        })
    })
    app.get('/kubernetes/logs', async (req, res, next) => {
        try {
            const data = await kubernetesLogs.getLogs(req.query.podName);
            return res.json(data);
        }
        catch (error) {
            next(error);
        }
    });
    app.get('/jaeger', async (req, res, next) => {
        try {
            const data = await getTrace(req.query.jobId);
            return res.json({ [`${req.query.jobId}`]: data });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/debug/add', async (req, res, next) => {
        try {
            const data = await addAlgorithmForDebug(req.body);
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/pipeline/add', async (req, res, next) => {
        try {
            const data = await addPipeFromSimulator(req.body);
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/exec/stop', async (req, res, next) => {
        try {
            const data = await stopExecution(req.body.jobId)
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/exec/stored', async (req, res, next) => {
        try {
            const data = await execStoredPipe({ pipe: req.body.pipeline })
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.put('/store/pipelines', async (req, res, next) => {
        try {
            const data = await updateStoredPipeline({ pipeline: req.body.pipeline })
            res.json({
                message: httpCodes[httpCode],
                data
            });
        } catch (error) {
            next(error);
        }
    });
    app.post('/exec/caching', async (req, res, next) => {
        try {
            const data = await execCaching(req.body)
            res.json({
                message: httpCodes[httpCode],
                data
            });
        } catch (error) {
            next(error);
        }
    })
    app.post('/store/algorithms', async (req, res, next) => {
        try {
            const data = await insertAlgorithmToStore(req.body)
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/store/algorithms/apply', upload.single('file'), async (req, res, next) => {
        try {
            const data = await applyAlgorithmToStore({ payload: req.body.payload, file: req.file })
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/store/algorithms', async (req, res, next) => {
        try {
            const data = await insertAlgorithmToStore(req.body)
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/cron/start', async (req, res, next) => {
        try {
            const data = await cronStart(req.body)
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/cron/stop', async (req, res, next) => {
        try {
            const data = await cronStop(req.body)
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.delete('/debug/delete/:algorithmName', async (req, res, next) => {
        try {
            const data = await deleteAlgorithmForDebug(req.params.algorithmName);
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.get('/download/results', async (req, res, next) => {
        try {
            const data = await storageManager.get({ path: req.query.path });
            // res.json(data);
            const json = JSON.stringify(data);
            const content = Buffer.from(json, "utf-8");
            const readStream = new stream.PassThrough();
            readStream.end(content);
            res.set('Content-disposition', 'attachment; filename=results.json');
            res.set('Content-Type', 'application/json');
            readStream.pipe(res);
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/builds/stop', async (req, res, next) => {
        const { buildId } = req.body;
        try {
            const data = await buildStop({ buildId });
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/builds/rerun', async (req, res, next) => {
        const { buildId } = req.body;
        try {
            const data = await buildRerun({ buildId });
            res.json({
                message: httpCodes[httpCode],
                data
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.delete('/store/algorithms/:algorithmName', async (req, res, next) => {
        log.info(`delete request for existing algorithm at store`);
        const httpCode = '200';

        let apiRes = null;
        try {
            apiRes = await deleteAlgorithmFromStore(req.params.algorithmName);
            if (apiRes.statusCode === 400) {
                const {
                    pipelines,
                    executions
                } = apiRes.body.error.details;

                // async promise resolve, un comment if api-server can handle
                // high-capacity of requests.

                // const promisesList = [];
                // pipelines.forEach(async p => {
                //     promisesList.push(deletePipelineFromStore(p))
                // })
                // executions.forEach(async e => {
                //     promisesList.push(stopExecution(e))
                // })
                // log.info(`execution to stop=${JSON.stringify(executions)}`);
                // log.info(`pipelines to delete=${JSON.stringify(pipelines)}`);

                // Promise.all(promisesList).then(async res => {
                //     res.forEach(promiseResult => log.info(`Status Code=${promiseResult.statusCode}, Status Msg=${promiseResult.statusMessage}`))
                //     try {
                //         apiRes = await deleteAlgorithmFromStore(req.params.algorithmName);
                //     } catch (error) {
                //         log.error(`failed to delete algorithm ${error}`);
                //     }
                // }).catch(err => {
                //     log.error('Error in promiseAll: ', err)
                // });

                // for not flooding the api-server (error 429)
                // use syncronic promise resolve.
                for (const p of pipelines) {
                    await delay(500)
                    await deletePipelineFromStore(p)
                }
                for (const e of executions) {
                    await delay(500)
                    await stopExecution(e)
                }
                apiRes = await deleteAlgorithmFromStore(req.params.algorithmName);

                res.json({
                    message: httpCodes[httpCode],
                    apiRes
                });
            }
        } catch (error) {
            next(error);
        }
    });
    app.delete('/store/pipelines/:pipelineName', async (req, res, next) => {
        let apiRes = null;
        try {
            apiRes = await deletePipelineFromStore(req.body.pipelineName);
            res.json({
                message: httpCodes[httpCode],
                apiRes
            });
        }
        catch (error) {
            next(error);
        }
    });
    app.get('/versions.html', (req, res, next) => {
        res.sendFile(path.join('/', 'versions', 'versions.html'));
    });
    app.get('/versions.json', (req, res, next) => {
        res.sendFile(path.join('/', 'versions', 'versions.json'));
    });
    app.get('/pods/:jobId', (req, res, next) => {
        etcdApi.getPodsByJobId(req.params.jobId).then((response) => {
            res.json(response);
        }).catch((error) => {
            res.status(404).json({
                error: error.message
            });
        })
    });

    app.use(errors);
    app.use((err, req, res, next) => {
        const { error, status } = err;
        const { url, method } = req;
        log.error(`${method} error response, url=${url} status=${status}, message=${error.message}`);
    });

    return new Promise((resolve, reject) => {
        server.listen(options.rest.port, () => {
            log.info('Rest server is listening on port ' + options.rest.port)
            resolve();
        });
    });
}

module.exports = serverInit;