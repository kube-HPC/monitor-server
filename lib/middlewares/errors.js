const errorResponse = require('../utils/error-response');

const errors = (error, req, res, next) => {
    const response = errorResponse(error);
    const status = response.code;
    res.status(status);
    res.json({ error: response });
    next({ error, status });
};

module.exports = errors;
