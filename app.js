const bodyParser = require('body-parser');
const socketIO = require('socket.io')

//const config = require('../src/config')
const app = require('express')();
const http = require('http')
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { incoming, outgoing } = require('./consts');
const etcdApi = require('./etcd-data');
server.listen(3002);


const runDataFromEtcd = async () => {
    etcdApi.on('result', (res) => {

        console.log('result', res)
    })
    await etcdApi.init();


}

const serverInit = async () => {
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
        console.log('result', res)
    })
    app.use(bodyParser.json());

    app.post('/webhook/result', (req, res) => {
        console.log('got result request');
        console.log(JSON.stringify(req.body));
        const httpCode = "200"; // httpCodes[rand];
        res.status(httpCode).json({ message: httpCodes[httpCode] });
        io.emit(outgoing.result, req.body);
        // console.log(`result response sent with ${httpCode} ${httpCodes[httpCode]}`);
    })

    app.post('/webhook/progress', (req, res) => {
        console.log('got progress request');
        console.log(JSON.stringify(req.body));
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

}


serverInit();
runDataFromEtcd();



