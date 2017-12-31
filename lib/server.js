const bodyParser = require('body-parser');
const socketIO = require('socket.io')
const app = require('express')();
const http = require('http')
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { incoming, outgoing } = require('./consts');
const etcdApi = require('./etcd-data');
const Logger = require('@hkube/logger');

let log;
const serverInit = async (options) => {
    log=Logger.GetLogFromContainer();
    await etcdApi.init();
    const httpCodes = Object.keys(http.STATUS_CODES);
    io.on('connection', (socket) => {
        // this._sockets.push(socket);
        socket.on('disconnect', () => {
            console.log('disconnect!!!')

            // this._sockets = this._sockets.filter(s => s !== socket)
        })
        console.log('connection!!!')
    })

    etcdApi.on('result', (res) => {
        io.emit(outgoing.progress, res);
        log.debug(`result: ${JSON.stringify(res,null,2)}`)
        
        // console.log('result', res)
    })
    app.use(bodyParser.json());

    app.post('/webhook/result', (req, res) => {
        log.debug('got result request');
        log.debug(JSON.stringify(req.body));
        const httpCode = "200"; // httpCodes[rand];
        res.status(httpCode).json({ message: httpCodes[httpCode] });
        io.emit(outgoing.result, req.body);
        // console.log(`result response sent with ${httpCode} ${httpCodes[httpCode]}`);
    })

    app.post('/webhook/progress', (req, res) => {
        log.debug('got progress request');
        log.debug(JSON.stringify(req.body));
        const httpCode = "200"; // httpCodes[rand];
        io.emit(outgoing.progress, req.body);
        res.status(httpCode).json({ message: httpCodes[httpCode] });

        // console.log(`progress response sent with ${httpCode} ${httpCodes[httpCode]}`);
    })

    app.get('/config', (res, req) => {
        res.status(200).json({
            //  socketPort: config.port
        })
    })

    return new Promise((resolve, reject) => {
        server.listen(options.rest.port,()=>{
            log.info('Rest server is listening on port '+options.rest.port)
            resolve();
        });
        
    });
    
}

module.exports = serverInit;