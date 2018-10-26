"use strict";
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var constants = require('../utils/constants.js');
var modules;
var library;
var self;
var priv = {};
var shared = {};
priv.loaded = false;
function Server(cb, scope) {
    library = scope;
    self = this;
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
    router.get('/', function (req, res) {
        res.render('index.html');
    });
    router.get('/api/blocks/totalsupply', function (req, res) {
        res.status(200).send("" + modules.blocks.getSupply() / constants.fixedPoint);
    });
    router.get('/api/blocks/circulatingsupply', function (req, res) {
        res.status(200).send("" + modules.blocks.getCirculatingSupply() / constants.fixedPoint);
    });
    router.get('/chains/:id', function (req, res) {
        res.render("chains/" + req.params.id + "/index.html");
    });
    router.use(function (req, res, next) {
        if (req.url.indexOf('/api/') === -1 && req.url.indexOf('/peer/') === -1) {
            return res.redirect('/');
        }
        return next();
    });
    library.network.app.use('/', router);
};
Server.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Server.prototype.onBind = function (scope) {
    modules = scope;
};
Server.prototype.onBlockchainReady = function () {
    priv.loaded = true;
};
Server.prototype.cleanup = function (cb) {
    priv.loaded = false;
    cb();
};
module.exports = Server;
