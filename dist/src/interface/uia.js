"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
module.exports = (router) => {
    router.get('/issuers', (req) => __awaiter(this, void 0, void 0, function* () {
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const count = yield app.sdb.count('Issuer');
        let issuers = [];
        if (count > 0) {
            issuers = yield app.sdb.findAll('Issuer', { limit, offset });
        }
        return { count, issuers };
    }));
    router.get('/issuers/:address', (req) => __awaiter(this, void 0, void 0, function* () {
        const issuer = yield app.sdb.findOne('Issuer', { condition: { issuerId: req.params.address } });
        if (!issuer)
            return 'Issuer not found';
        return { issuer };
    }));
    router.get('/assets', (req) => __awaiter(this, void 0, void 0, function* () {
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const count = yield app.sdb.count('Asset');
        let assets = [];
        if (count > 0) {
            assets = yield app.sdb.findAll('Asset', { limit, offset });
        }
        return { count, assets };
    }));
    router.get('/issuers/:address/assets', (req) => __awaiter(this, void 0, void 0, function* () {
        const offset = req.query.offset ? Number(req.query.offset) : 0;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const issuerId = req.params.address;
        const condition = { issuerId };
        const count = yield app.sdb.count('Asset', condition);
        let assets = [];
        if (count > 0) {
            assets = yield app.sdb.findAll('Asset', { condition, limit, offset });
        }
        return { count, assets };
    }));
    router.get('/assets/:name', (req) => __awaiter(this, void 0, void 0, function* () {
        const asset = yield app.sdb.findOne('Asset', { condition: { name: req.params.name } });
        if (!asset)
            return 'Asset not found';
        return { asset };
    }));
};
