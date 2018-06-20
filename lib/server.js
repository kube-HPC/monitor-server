const bodyParser = require('body-parser');
const path = require('path')
const app = require('express')();
const http = require('http')
const server = require('http').Server(app);
const io = require('socket.io')(server);
const CONSTS = require('./consts');
const etcdApi = require('./etcd-data');
const Logger = require('@hkube/logger');
let log;

const enable = () => {
    const clients = Object.keys(io.sockets.sockets);
    etcdApi.enable(clients.length > 0);
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

    etcdApi.on('result', (res) => {
        io.emit(CONSTS.progress, res);
    })

    app.use(bodyParser.json());

    app.post('/webhook/result', (req, res) => {
        const httpCode = "200";
        etcdApi.addWebhook(req.body);
        res.status(httpCode).json({ message: httpCodes[httpCode] });
    })
    app.post('/webhook/progress', (req, res) => {
        const httpCode = "200";
        etcdApi.addWebhook(req.body);
        res.status(httpCode).json({ message: httpCodes[httpCode] });
    })
    app.get('/config', (req, res) => {
        res.status(200).json({
            //  socketPort: config.port
        })
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
    return new Promise((resolve, reject) => {
        server.listen(options.rest.port, () => {
            log.info('Rest server is listening on port ' + options.rest.port)
            resolve();
        });
    });
}

module.exports = serverInit;