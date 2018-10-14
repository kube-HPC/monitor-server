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
const { addAlgorithmForDebug,deleteAlgorithmForDebug, addPipeFromSimulator, getStoredPipes } = require('./api-server')
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
        res.status(httpCode).json({ message: httpCodes[httpCode] });
    })
    app.post('/webhook/progress', async (req, res) => {
        const httpCode = "200";
        etcdApi.addWebhook(req.body);
        res.status(httpCode).json({ message: httpCodes[httpCode] });
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
            const data =  await addAlgorithmForDebug(req.body)
            res.status(httpCode).json({ message: httpCodes[httpCode], data });
        } catch (error) {
            log.error(`error on add debug ${error}`)
        }
    })
    app.post('/pipeline/add', async (req ,res) => {
        log.info(`post request from simulator for adding a pipeline`);
        const httpCode = "200";
        try {
            const data =  await addPipeFromSimulator(req.body)
            res.status(httpCode).json({ message: httpCodes[httpCode], data });
        } catch (error) {
            log.error(`error on pipeline add ${error}`)
        }
    });
    app.delete('/debug/delete/:algorithmName', async (req, res) => {
        log.info(`get request from client to delete algorithm`);
        const httpCode = "200";
        const data = await deleteAlgorithmForDebug(req.params.algorithmName)
        res.status(httpCode).json({ message: httpCodes[httpCode], data });
    })
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
            res.status(404).json({ error: error.message });
        })
    })
    app.get('/store/pipelines', async (req, res) => {
        log.info(`get request from simulator for getting stored pipelines`);
        const httpCode = "200";
        try {
            const data =  await getStoredPipes(req.body);
            res.status(httpCode).json({ message: httpCodes[httpCode], data });
        } catch (error) {
            log.error(`error on getting stored pipelines: ${error}`);
        }
    })
    return new Promise((resolve, reject) => {
        server.listen(options.rest.port, () => {
            log.info('Rest server is listening on port ' + options.rest.port)
            resolve();
        });
    });
}

module.exports = serverInit;