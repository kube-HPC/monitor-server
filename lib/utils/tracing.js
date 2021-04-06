const logWrapper = (method, instance, log) => {
    log.info(`tracing ${method.name}`);
    return async (...args) => {
        const start = Date.now();
        log.debug(`${method.name} start`);
        const ret = await method.apply(instance, args);
        log.debug(`${method.name} end, took: ${Date.now() - start}`);
        return ret;
    };
};

const logWrappers = (methods, instance, log) => {
    methods.forEach((m) => {
        instance[m] = logWrapper(instance[m], instance, log);
    });
};

module.exports = {
    logWrapper,
    logWrappers
};
