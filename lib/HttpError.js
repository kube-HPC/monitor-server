
class HttpError extends Error {
    constructor(error) {
        super(error.message);
        this.code = error.code;
        this.message = error.message;
        this.details = error.details;
    }
}

module.exports = HttpError;
