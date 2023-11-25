const path = require('path');
var debug = require('debug')('userapp:supporter-service');
var models = require('../../models');

// development, production, test
const env = process.env.NODE_ENV || 'development';
const webSocketConfig = require(path.join(__dirname, '../..', 'config', 'websocket-config.json'))[env];
const chatServerIp = webSocketConfig.serverIp;
const chatServerPort = webSocketConfig.serverPort;

exports.getGCSPage = function(req, res, next) {
    res.render('gcs.html', {serverIp: chatServerIp, serverPort: chatServerPort});
}