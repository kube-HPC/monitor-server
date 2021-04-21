const { nodeKind } = require('@hkube/consts');

const searchComponents = {
    Algorunner: 'Algorunner',
    Consumer: 'Jobs-Consumer',
};

const getSearchComponent = (kind) => {
    switch (kind) {
    case nodeKind.DataSource:
        return [searchComponents.Consumer];
    case 'worker':
    default:
        return [searchComponents.Algorunner];
    }
};

module.exports = {
    searchComponents,
    getSearchComponent
};
