const { nodeKind } = require('@hkube/consts');
const { components, containers } = require('./consts');

const getSearchComponent = (kind) => {
    switch (kind) {
        case nodeKind.DataSource:
            return [components.Consumer];
        case containers.pipelineDriver:
            return [];
        case containers.worker:
            return [components.Algorunner];
        default:
            throw new Error(`invalid node kind ${kind}`);
    }
};

module.exports = {
    getSearchComponent
};
