
const configIt = require('@hkube/config');
const { main, logger } = configIt.load();
const Logger = require('@hkube/logger');
const monitor = require('@hkube/redis-utils').Monitor;
const log = new Logger(main.serviceName, logger);
const serverInit = require('./lib/server');
const etcdApi = require('./lib/etcd-data');
const redisAdapter = require('./lib/redis-storage-adapter');
const kubernetesLogs = require('./lib/kubernetes/logs');


class Bootstrap {
    async init() {
        try {
            this._handleErrors();
            log.info('running application in ' + configIt.env() + ' environment', { component: 'main' });
            await etcdApi.init(main);
            monitor.on('ready', (data) => {
                log.info((data.message).green, { component: 'main' });
            });
            monitor.on('close', (data) => {
                log.error(data.error.message, { component: 'main' });
            });
            await monitor.check(main.redis);
            await kubernetesLogs.init(main);
            await serverInit(main);
            await redisAdapter.init(main);
            return main;
        }
        catch (error) {
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
            log.error('unhandledRejection: ' + (error.message || error), { component: 'main' }, error);
        });
        process.on('uncaughtException', (error) => {
            log.error('uncaughtException: ' + error.message, { component: 'main' }, error);
            process.exit(1);
        });
    }
}

module.exports = new Bootstrap();

