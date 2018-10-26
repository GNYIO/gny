"use strict";
const Router = require("../utils/router");
const sandboxHelper = require("../utils/sandbox");
const constants = require("../utils/constants");
let modules;
let library;
let self;
const priv = {};
const shared = {};
priv.loaded = false;
function Server(cb, scope) {
    library = scope;
    self = this;
    priv.attachApi();
    setImmediate(cb, null, self);
}
priv.attachApi = () => {
    const router = new Router();
    router.use((req, res, next) => {
        if (modules)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.get('/', (req, res) => {
        res.render('index.html');
    });
    router.get('/api/blocks/totalsupply', (req, res) => {
        res.status(200).send(`${modules.blocks.getSupply() / constants.fixedPoint}`);
    });
    router.get('/api/blocks/circulatingsupply', (req, res) => {
        res.status(200).send(`${modules.blocks.getCirculatingSupply() / constants.fixedPoint}`);
    });
    router.get('/chains/:id', (req, res) => {
        res.render(`chains/${req.params.id}/index.html`);
    });
    router.use((req, res, next) => {
        if (req.url.indexOf('/api/') === -1 && req.url.indexOf('/peer/') === -1) {
            return res.redirect('/');
        }
        return next();
    });
    library.network.app.use('/', router);
};
Server.prototype.sandboxApi = (call, args, cb) => {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Server.prototype.onBind = (scope) => {
    modules = scope;
};
Server.prototype.onBlockchainReady = () => {
    priv.loaded = true;
};
Server.prototype.cleanup = (cb) => {
    priv.loaded = false;
    cb();
};
module.exports = Server;
