"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("../utils/router");
const constants = require("../utils/constants");
class Server {
    constructor(scope) {
        this.isLoaded = false;
        this.library = scope;
    }
    attachApi() {
        const router = new Router();
        router.use((req, res, next) => {
            if (modules)
                return next();
            return res.status(500).send({
                success: false,
                error: 'Blockchain is loading',
            });
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
        this.library.network.app.use('/', router);
    }
    onBind(scope) {
        this.modules = scope;
    }
    onBlockchainReady() {
        this.isLoaded = true;
    }
    cleanup() {
        this.isLoaded = false;
    }
}
exports.default = Server;
