
const configIt = require('@hkube/config');
const Logger = require('@hkube/logger');
const monitor = require('@hkube/redis-utils').Monitor;
const storageManager = require('@hkube/storage-manager');
const { rest: healthcheck } = require('@hkube/healthchecks');
const { main, logger } = configIt.load();
const log = new Logger(main.serviceName, logger);
const serverInit = require('./lib/service/server');
const etcdApi = require('./lib/service/etcd-data');
const graphHelper = require('./lib/service/graph-helper');
const resultGather = require('./lib/service/result-gather');
const nodeStatisticsData = require('./lib/node-statistics/statistics');
const redisAdapter = require('./lib/service/redis-storage-adapter');
const logs = require('./lib/task-logs/logs');

class Bootstrap {
    async init() {
        try {
            this._handleErrors();
            log.info('running application in ' + configIt.env() + ' environment', { component: 'main' });
            await etcdApi.init(main);
            nodeStatisticsData.init(main);
            monitor.on('ready', (data) => {
                log.info((data.message).green, { component: 'main' });
            });
            monitor.on('close', (data) => {
                log.error(data.error.message, { component: 'main' });
            });
            await monitor.check(main.redis);
            await logs.init(main);
            await serverInit(main);
            await redisAdapter.init(main);
            await storageManager.init(main, false);
            graphHelper.init(main);
            await healthcheck.init({ port: main.healthchecks.port });
            healthcheck.start(main.healthchecks.path, () => {
                return resultGather.checkHealth(main.healthchecks.maxDiff) &&
                    nodeStatisticsData.checkHealth(main.healthchecks.maxDiff)
            }, 'health');
            return main;
        }
        catch (error) {
            this._onInitFailed(error);
        }
    }

    _onInitFailed(error) {
        log.error(error.message, { component: 'main' }, error);
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

