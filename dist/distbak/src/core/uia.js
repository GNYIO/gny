"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function () { if (t[0] & 1)
            throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (_)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return { value: op[1], done: false };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            }
            catch (e) {
                op = [6, e];
                y = 0;
            }
            finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var crypto = require('crypto');
var isArray = require('util').isArray;
var jsonSql = require('json-sql')();
jsonSql.setDialect('sqlite');
var ed = require('../utils/ed.js');
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var addressHelper = require('../utils/address.js');
var modules;
var library;
var self;
var priv = {};
var shared = {};
function UIA(cb, scope) {
    library = scope;
    self = this;
    priv.attachApi();
    cb(null, self);
}
priv.attachApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.map(shared, {
        'get /issuers': 'getIssuers',
        'get /issuers/:name': 'getIssuer',
        'get /issuers/:name/assets': 'getIssuerAssets',
        'get /assets': 'getAssets',
        'get /assets/:name': 'getAsset',
        'get /balances/:address': 'getBalances',
        'get /balances/:address/:currency': 'getBalance',
        'put /transfers': 'transferAsset',
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/uia', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err);
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
UIA.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
function trimPrecision(amount, precision) {
    var s = amount.toString();
    return String(Number.parseInt(s.substr(0, s.length - precision), 10));
}
UIA.prototype.toAPIV1UIABalances = function (balances) {
    if (!(balances && isArray(balances) && balances.length > 0))
        return balances;
    var assetMap = new Map();
    app.sdb.getAll('Asset').forEach(function (asset) { return assetMap.set(asset.name, self.toAPIV1Asset(asset)); });
    return balances.map(function (b) {
        b.balance = String(b.balance);
        return assetMap.has(b.currency) ? Object.assign(b, assetMap.get(b.currency)) : b;
    });
};
UIA.prototype.toAPIV1Assets = function (assets) {
    return ((assets && isArray(assets) && assets.length > 0)
        ? assets.map(function (a) { return self.toAPIV1Asset(a); })
        : []);
};
UIA.prototype.toAPIV1Asset = function (asset) {
    if (!asset)
        return asset;
    return {
        name: asset.name,
        desc: asset.desc,
        maximum: String(asset.maximum),
        precision: asset.precision,
        quantity: String(asset.quantity),
        issuerId: asset.issuerId,
        height: asset.height,
        writeoff: 0,
        maximumShow: trimPrecision(asset.maximum, asset.precision),
        quantityShow: trimPrecision(asset.quantity, asset.precision),
    };
};
UIA.prototype.onBind = function (scope) {
    modules = scope;
};
shared.getIssuers = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            limit: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
            },
            offset: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, function (err) {
        if (err)
            return cb("Invalid parameters: " + err[0]);
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var limitAndOffset, count, issues, dbErr_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
                            return [4, app.sdb.count('Issuer', {})];
                        case 1:
                            count = _a.sent();
                            return [4, app.sdb.find('Issuer', {}, limitAndOffset)];
                        case 2:
                            issues = _a.sent();
                            return [2, cb(null, { count: count, issues: issues })];
                        case 3:
                            dbErr_1 = _a.sent();
                            return [2, cb("Failed to get issuers: " + dbErr_1)];
                        case 4: return [2];
                    }
                });
            });
        })();
    });
};
shared.getIssuerByAddress = function (req, cb) {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
        return cb('Invalid address');
    }
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var issues, dbErr_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4, app.sdb.find('Issuer', { address: req.params.address })];
                    case 1:
                        issues = _a.sent();
                        if (!issuers || issuers.length === 0)
                            return [2, cb('Issuer not found')];
                        return [2, cb(null, { issuer: issues[0] })];
                    case 2:
                        dbErr_2 = _a.sent();
                        return [2, cb("Failed to get issuer: " + dbErr_2)];
                    case 3: return [2];
                }
            });
        });
    })();
};
shared.getIssuer = function (req, cb) {
    if (req.params && addressHelper.isAddress(req.params.name)) {
        req.params.address = req.params.name;
        return shared.getIssuerByAddress(req, cb);
    }
    var query = req.params;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                minLength: 1,
                maxLength: 16,
            },
        },
        required: ['name'],
    }, function (err) {
        if (err)
            return cb("Invalid parameters: " + err[0]);
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var issuers, dbErr_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, app.sdb.find('Issuer', { name: req.params.name })];
                        case 1:
                            issuers = _a.sent();
                            if (!issuers || issuers.length === 0)
                                return [2, cb('Issuer not found')];
                            return [2, cb(null, { issuer: issuers[0] })];
                        case 2:
                            dbErr_3 = _a.sent();
                            return [2, cb("Failed to get issuers: " + dbErr_3)];
                        case 3: return [2];
                    }
                });
            });
        })();
    });
    return null;
};
shared.getIssuerAssets = function (req, cb) {
    if (!req.params || !req.params.name || req.params.name.length > 32) {
        cb(' Invalid parameters');
        return;
    }
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            limit: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
            },
            offset: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, function (err) {
        if (err)
            return cb("Invalid parameters: " + err[0]);
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var limitAndOffset, condition, count, assets, dbErr_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
                            condition = { issuerName: req.params.name };
                            return [4, app.sdb.count('Asset', condition)];
                        case 1:
                            count = _a.sent();
                            return [4, app.sdb.find('Asset', condition, limitAndOffset)];
                        case 2:
                            assets = _a.sent();
                            return [2, cb(null, { count: count, assets: self.toAPIV1Assets(assets) })];
                        case 3:
                            dbErr_4 = _a.sent();
                            return [2, cb("Failed to get assets: " + dbErr_4)];
                        case 4: return [2];
                    }
                });
            });
        })();
    });
};
shared.getAssets = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            limit: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
            },
            offset: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, function (err) {
        if (err)
            return cb("Invalid parameters: " + err[0]);
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var condition, limitAndOffset, count, assets, dbErr_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            condition = {};
                            limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
                            return [4, app.sdb.count('Asset', condition)];
                        case 1:
                            count = _a.sent();
                            return [4, app.sdb.find('Asset', condition, limitAndOffset)];
                        case 2:
                            assets = _a.sent();
                            return [2, cb(null, { count: count, assets: self.toAPIV1Assets(assets) })];
                        case 3:
                            dbErr_5 = _a.sent();
                            return [2, cb("Failed to get assets: " + dbErr_5)];
                        case 4: return [2];
                    }
                });
            });
        })();
    });
};
shared.getAsset = function (req, cb) {
    var query = req.params;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                minLength: 1,
                maxLength: 32,
            },
        },
        required: ['name'],
    }, function (err) {
        if (err)
            cb("Invalid parameters: " + err[0]);
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var condition, assets, dbErr_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            condition = { name: query.name };
                            return [4, app.sdb.find('Asset', condition)];
                        case 1:
                            assets = _a.sent();
                            if (!assets || assets.length === 0)
                                return [2, cb('Asset not found')];
                            return [2, cb(null, { asset: self.toAPIV1Asset(assets[0]) })];
                        case 2:
                            dbErr_6 = _a.sent();
                            return [2, cb("Failed to get asset: " + dbErr_6)];
                        case 3: return [2];
                    }
                });
            });
        })();
    });
};
shared.getBalances = function (req, cb) {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
        return cb('Invalid address');
    }
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            limit: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
            },
            offset: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, function (err) {
        if (err)
            return cb("Invalid parameters: " + err[0]);
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var condition, count, resultRange, balances, dbErr_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            condition = { address: req.params.address };
                            return [4, app.sdb.count('Balance', condition)];
                        case 1:
                            count = _a.sent();
                            resultRange = { limit: query.limit, offset: query.offset };
                            return [4, app.sdb.find('Balance', condition, resultRange)];
                        case 2:
                            balances = _a.sent();
                            return [2, cb(null, { count: count, balances: self.toAPIV1UIABalances(balances) })];
                        case 3:
                            dbErr_7 = _a.sent();
                            return [2, cb("Failed to get balances: " + dbErr_7)];
                        case 4: return [2];
                    }
                });
            });
        })();
    });
    return null;
};
shared.getBalance = function (req, cb) {
    if (!req.params)
        return cb('Invalid parameters');
    if (!addressHelper.isAddress(req.params.address))
        return cb('Invalid address');
    if (!req.params.currency || req.params.currency.length > 22)
        return cb('Invalid currency');
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var condition, balances, dbErr_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        condition = { address: req.params.address, currency: req.params.currency };
                        return [4, app.sdb.find('Balance', condition)];
                    case 1:
                        balances = _a.sent();
                        if (!balances || balances.length === 0)
                            return [2, cb('Balance info not found')];
                        balances = self.toAPIV1UIABalances(balances);
                        return [2, cb(null, { balance: balances[0] })];
                    case 2:
                        dbErr_8 = _a.sent();
                        return [2, cb("Failed to get issuers: " + dbErr_8)];
                    case 3: return [2];
                }
            });
        });
    })();
};
shared.transferAsset = function (req, cb) {
    var query = req.body;
    var valid = library.scheme.validate(query, {
        type: 'object',
        properties: {
            secret: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
            },
            currency: {
                type: 'string',
                maxLength: 22,
            },
            amount: {
                type: 'string',
                maxLength: 50,
            },
            recipientId: {
                type: 'string',
                minLength: 1,
            },
            publicKey: {
                type: 'string',
                format: 'publicKey',
            },
            secondSecret: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
            },
            multisigAccountPublicKey: {
                type: 'string',
                format: 'publicKey',
            },
            message: {
                type: 'string',
                maxLength: 256,
            },
            fee: {
                type: 'integer',
                minimum: 10000000,
            },
        },
        required: ['secret', 'amount', 'recipientId', 'currency'],
    });
    if (!valid) {
        library.logger.warn('Failed to validate query params', library.scheme.getLastError());
        return setImmediate(cb, library.scheme.getLastError().details[0].message);
    }
    return library.sequence.add(function (callback) {
        (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var hash, keypair, secondKeypair, trs, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            hash = crypto.createHash('sha256').update(query.secret, 'utf8').digest();
                            keypair = ed.MakeKeypair(hash);
                            secondKeypair = null;
                            if (query.secondSecret) {
                                secondKeypair = ed.MakeKeypair(crypto.createHash('sha256').update(query.secondSecret, 'utf8').digest());
                            }
                            trs = library.base.transaction.create({
                                secret: query.secret,
                                fee: query.fee || 10000000,
                                type: 103,
                                senderId: query.senderId || null,
                                args: [query.currency, query.amount, query.recipientId],
                                message: query.message || null,
                                secondKeypair: secondKeypair,
                                keypair: keypair,
                            });
                            return [4, modules.transactions.processUnconfirmedTransactionAsync(trs)];
                        case 1:
                            _a.sent();
                            library.bus.message('unconfirmedTransaction', trs);
                            callback(null, { transactionId: trs.id });
                            return [3, 3];
                        case 2:
                            e_1 = _a.sent();
                            library.logger.warn('Failed to process unsigned transaction', e_1);
                            callback(e_1.toString());
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        })();
    }, cb);
};
module.exports = UIA;
