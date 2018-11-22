const bodyParser = require('body-parser');
const path = require('path')
const app = require('express')();
const cors = require('cors')
const http = require('http')
const server = require('http').Server(app);
const io = require('socket.io')(server);
const CONSTS = require('./consts');
const etcdApi = require('./etcd-data');
const resultGather = require('./result-gather')
const Logger = require('@hkube/logger');
const delay = require('await-delay');
const {
    addAlgorithmForDebug,
    deleteAlgorithmForDebug,
    addPipeFromSimulator,
    execStoredPipe,
    deleteAlgorithmFromStore,
    insertAlgorithmToStore,
    deletePipelineFromStore,
    stopExecution
} = require('./api-server')
let log;

const enable = () => {
    const clients = Object.keys(io.sockets.sockets);
    resultGather.enable(clients.length > 0);
}

const serverInit = async (options) => {
    log = Logger.GetLogFromContainer();
    const httpCodes = Object.keys(http.STATUS_CODES);
    io.on('connection', (socket) => {
        enable();
        socket.on('disconnect', () => {
            enable();
            log.info('disconnect!!!');
        });
        log.info('connection!!!');
    })

    resultGather.on('result', (res) => {
        io.emit(CONSTS.progress, res);
    })
    app.use(bodyParser.json());
    app.use(cors())
    app.post('/webhook/result', (req, res) => {
        const httpCode = "200";
        etcdApi.addWebhook(req.body);
        res.status(httpCode).json({
            message: httpCodes[httpCode]
        });
    })
    app.post('/webhook/progress', async (req, res) => {
        const httpCode = "200";
        etcdApi.addWebhook(req.body);
        res.status(httpCode).json({
            message: httpCodes[httpCode]
        });
        //  res.status(httpCode).json({ message: httpCodes[httpCode] });
    })
    app.get('/config', (req, res) => {
        res.status(200).json({
            //  socketPort: config.port
        })
    })
    app.post('/debug/add', async (req, res) => {
        log.info(`get request from client to add new algorithm`);
        const httpCode = "200";
        try {
            const data = await addAlgorithmForDebug(req.body)
            res.status(httpCode).json({
                message: httpCodes[httpCode],
                data
            });
        } catch (error) {
            log.error(`error on add debug ${error}`)
        }
    })
    app.post('/pipeline/add', async (req, res) => {
        log.info(`post request from simulator for adding a pipeline`);
        const httpCode = "200";
        try {
            const data = await addPipeFromSimulator(req.body)
            res.status(httpCode).json({
                message: httpCodes[httpCode],
                data
            });
        } catch (error) {
            log.error(`error on pipeline add ${error}`)
        }
    });
    app.post('/exec/stored', async (req, res) => {
        log.info(`Start pipeline execution, name ${req.body.pipe.name}`);
        const httpCode = "200";
        try {
            const data = await execStoredPipe(req.body)
            res.status(httpCode).json({
                message: httpCodes[httpCode],
                data
            });
        } catch (error) {
            log.error(`error on exec/stored ${error}`)
        }
    });
    app.post('/store/algorithms', async (req, res) => {
        log.info(`Post request for inserting new algorithm=${req.body.algorithm.name} to store if not exists`);
        const httpCode = "200";
        try {
            const data = await insertAlgorithmToStore(req.body)
            res.status(httpCode).json({
                message: httpCodes[httpCode],
                data
            });
        } catch (error) {
            log.error(`error on post req /store/algorithm: ${error}`)
        }
    });
    app.delete('/debug/delete/:algorithmName', async (req, res) => {
        log.info(`get request from client to delete algorithm`);
        const httpCode = "200";
        try {
            const data = await deleteAlgorithmForDebug(req.params.algorithmName)
        } catch (error) {
            console.log(`error ==> ${error}`)
        }
        res.status(httpCode).json({
            message: httpCodes[httpCode],
            data
        });
    });

    async function asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }

    app.delete('/store/algorithms/:algorithmName', async (req, res) => {
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

                res.status(httpCode).json({
                    message: httpCodes[httpCode],
                    apiRes
                });
            }
        } catch (error) {
            log.error(`error in deleteAlgorithmFromStore ==> ${error}`);
        }

    });

    app.get('/versions.html', (req, res) => {
        res.sendFile(path.join('/', 'versions', 'versions.html'));
    })
    app.get('/versions.json', (req, res) => {
        res.sendFile(path.join('/', 'versions', 'versions.json'));
    })
    app.get('/pods/:jobId', (req, res) => {
        etcdApi.getPodsByJobId(req.params.jobId).then((response) => {
            res.status(200).json(response);
        }).catch((error) => {
            res.status(404).json({
                error: error.message
            });
        })
    })

    return new Promise((resolve, reject) => {
        server.listen(options.rest.port, () => {
            log.info('Rest server is listening on port ' + options.rest.port)
            resolve();
        });
    });
}

module.exports = serverInit;