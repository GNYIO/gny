"use strict";
var os = require('os');
var sandboxHelper = require('../utils/sandbox.js');
var slots = require('../utils/slots.js');
var Router = require('../utils/router.js');
var modules;
var library;
var self;
var priv = {};
var shared = {};
function System(cb, scope) {
    library = scope;
    self = this;
    priv.version = library.config.version;
    priv.port = library.config.port;
    priv.magic = library.config.magic;
    priv.osName = os.platform() + os.release();
    priv.attachApi();
    setImmediate(cb, null, self);
}
priv.attachApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.map(shared, {
        'get /': 'getSystemInfo',
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/system', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
shared.getSystemInfo = function (req, cb) {
    var lastBlock = modules.blocks.getLastBlock();
    return cb(null, {
        os: os.platform() + "_" + os.release(),
        version: library.config.version,
        timestamp: Date.now(),
        lastBlock: {
            height: lastBlock.height,
            timestamp: slots.getRealTime(lastBlock.timestamp),
            behind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) + 1),
        },
    });
};
System.prototype.getOS = function () { return priv.osName; };
System.prototype.getVersion = function () { return priv.version; };
System.prototype.getPort = function () { return priv.port; };
System.prototype.getMagic = function () { return priv.magic; };
System.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
System.prototype.onBind = function (scope) {
    modules = scope;
};
module.exports = System;
