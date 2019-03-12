/*
 * Created by nassi on 22/11/15.
 * Error handler middleware
 */

const errors = (error, req, res, next) => {
    const status = error.code || 500;
    res.status(status);
    res.json({
        error: {
            code: status,
            message: error.message,
            details: error.details
        }
    });
    next({ error, status });
};

module.exports = errors;
