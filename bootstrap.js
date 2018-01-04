
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

const configIt = require('@hkube/config');
const Logger = require('@hkube/logger');
const VerbosityPlugin = require('@hkube/logger').VerbosityPlugin;
let log;
const serverInit = require('./lib/server');
const etcdApi=require('./lib/etcd-data');

class Bootstrap {
    async init() {
        try {
            const { main, logger } = configIt.load();
            this._handleErrors();

            log = new Logger(main.serviceName, logger);
            log.plugins.use(new VerbosityPlugin(main.redis));
            log.info('running application in ' + configIt.env() + ' environment', { component: 'main' });

            await etcdApi.init(main);
            await serverInit(main);
            return main;
        }
        catch (error) {
            log.error(error);
            this._onInitFailed(new Error(`unable to start application. ${error.message}`));
        }
    }

    _onInitFailed(error) {
        if (log) {
            log.error(error.message, { component: 'main' }, error);
            log.error(error);
        }
        else {
            console.error(error.message);
            console.error(error);
        }
        process.exit(1);
    }

    _handleErrors() {
        process.on('exit', (code) => {
            log.info('exit' + (code ? ' code ' + code : ''), { component: 'main' });
        });
        process.on('SIGINT', () => {
            log.info('SIGINT', { component: 'main' });
            process.exit(1);
        });
        process.on('SIGTERM', () => {
            log.info('SIGTERM', { component: 'main' });
            process.exit(1);
        });
        process.on('unhandledRejection', (error) => {
            log.error('unhandledRejection: ' + (error.message||error), { component: 'main' }, error);
        });
        process.on('uncaughtException', (error) => {
            log.error('uncaughtException: ' + error.message, { component: 'main' }, error);
            process.exit(1);
        });
    }
}

module.exports = new Bootstrap();

