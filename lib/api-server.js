
const requestClient = require('request');
const HttpError = require("./HttpError");
const { main } = require("@hkube/config").load();
const { protocol, host, port, base_path } = main.apiServer;
const baseUri = `${protocol}://${host}:${port}/${base_path}`;

const request = (options) => {
    return new Promise((resolve, reject) => {
        requestClient({
            ...options,
            json: true
        }, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            if (response.body && response.body.error) {
                return reject(new HttpError(response.body.error));
            }
            return resolve(body);
        });
    });
}

module.exports = {

};
