
const errors = (error) => {
    const status = Number.isInteger(error.code) ? error.code : 500;
    return {
        code: status,
        message: error.message,
        details: error.details
    };
};

module.exports = errors;
