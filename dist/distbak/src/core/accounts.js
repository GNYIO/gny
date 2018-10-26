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
var util = require('util');
var Mnemonic = require('bitcore-mnemonic');
var ed = require('../utils/ed.js');
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var addressHelper = require('../utils/address.js');
var PIFY = util.promisify;
var modules;
var library;
var self;
var priv = {};
var shared = {};
function Accounts(cb, scope) {
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
    router.map(shared, {
        'post /open': 'open',
        'post /open2': 'open2',
        'get /getBalance': 'getBalance',
        'get /getPublicKey': 'getPublickey',
        'post /generatePublicKey': 'generatePublickey',
        'get /delegates': 'myVotedDelegates',
        'get /': 'getAccount',
        'get /new': 'newAccount',
    });
    router.get('/count', function (req, res) {
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var count, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, app.sdb.count('Account')];
                        case 1:
                            count = _a.sent();
                            return [2, res.json({ success: true, count: count })];
                        case 2:
                            e_1 = _a.sent();
                            return [2, res.status(500).send({ success: false, error: 'Server error' })];
                        case 3: return [2];
                    }
                });
            });
        })();
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint was not found' });
    });
    library.network.app.use('/api/accounts', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err);
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
priv.openAccount = function (secret, cb) {
    var hash = crypto.createHash('sha256').update(secret, 'utf8').digest();
    var keypair = ed.MakeKeypair(hash);
    var publicKey = keypair.publicKey.toString('hex');
    var address = self.generateAddressByPublicKey(publicKey);
    shared.getAccount({ body: { address: address } }, function (err, ret) {
        if (ret && ret.account && !ret.account.publicKey) {
            ret.account.publicKey = publicKey;
        }
        cb(err, ret);
    });
};
priv.openAccount2 = function (publicKey, cb) {
    var address = self.generateAddressByPublicKey(publicKey);
    shared.getAccount({ body: { address: address } }, function (err, ret) {
        if (ret && ret.account && !ret.account.publicKey) {
            ret.account.publicKey = publicKey;
        }
        cb(err, ret);
    });
};
Accounts.prototype.generateAddressByPublicKey = function (publicKey) {
    return addressHelper.generateNormalAddress(publicKey);
};
Accounts.prototype.generateAddressByPublicKey2 = function (publicKey) {
    if (!global.featureSwitch.enableUIA) {
        return self.generateAddressByPublicKey(publicKey);
    }
    var oldAddress = self.generateAddressByPublicKey(publicKey);
    if (library.balanceCache.getNativeBalance(oldAddress)) {
        return oldAddress;
    }
    return addressHelper.generateNormalAddress(publicKey);
};
Accounts.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Accounts.prototype.onBind = function (scope) {
    modules = scope;
};
shared.newAccount = function (req, cb) {
    var ent = Number(req.body.ent);
    if ([128, 256, 384].indexOf(ent) === -1) {
        ent = 128;
    }
    var secret = new Mnemonic(ent).toString();
    var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
    var address = self.generateAddressByPublicKey(keypair.publicKey);
    cb(null, {
        secret: secret,
        publicKey: keypair.publicKey.toString('hex'),
        privateKey: keypair.privateKey.toString('hex'),
        address: address,
    });
};
shared.open = function (req, cb) {
    var body = req.body;
    library.scheme.validate(body, {
        type: 'object',
        properties: {
            secret: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
            },
        },
        required: ['secret'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return priv.openAccount(body.secret, cb);
    });
};
shared.open2 = function (req, cb) {
    var body = req.body;
    library.scheme.validate(body, {
        type: 'object',
        properties: {
            publicKey: {
                type: 'string',
                format: 'publicKey',
            },
        },
        required: ['publicKey'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return priv.openAccount2(body.publicKey, cb);
    });
};
shared.getBalance = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            address: {
                type: 'string',
                minLength: 1,
                maxLength: 50,
            },
        },
        required: ['address'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        if (!addressHelper.isAddress(query.address)) {
            return cb('Invalid address');
        }
        return shared.getAccount({ body: { address: query.address } }, function (err2, ret) {
            if (err2) {
                return cb(err2.toString());
            }
            var balance = ret && ret.account ? ret.account.balance : 0;
            var unconfirmedBalance = ret && ret.account ? ret.account.unconfirmedBalance : 0;
            return cb(null, { balance: balance, unconfirmedBalance: unconfirmedBalance });
        });
    });
};
shared.getPublickey = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            address: {
                type: 'string',
                minLength: 1,
            },
        },
        required: ['address'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return self.getAccount({ address: query.address }, function (err2, account) {
            if (err2) {
                return cb(err2.toString());
            }
            if (!account || !account.publicKey) {
                return cb('Account does not have a public key');
            }
            return cb(null, { publicKey: account.publicKey });
        });
    });
};
shared.generatePublickey = function (req, cb) {
    var body = req.body;
    library.scheme.validate(body, {
        type: 'object',
        properties: {
            secret: {
                type: 'string',
                minLength: 1,
            },
        },
        required: ['secret'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        var kp = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
        var publicKey = kp.publicKey.toString('hex');
        return cb(null, { publicKey: publicKey });
    });
};
shared.myVotedDelegates = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            address: {
                type: 'string',
                minLength: 1,
            },
            name: {
                type: 'string',
                minLength: 1,
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var addr, account, votes, delegateNames_1, _i, votes_1, v, delegates, myVotedDelegates, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            addr = void 0;
                            if (!query.name)
                                return [3, 2];
                            return [4, app.sdb.load('Account', { name: query.name })];
                        case 1:
                            account = _a.sent();
                            if (!account) {
                                return [2, cb('Account not found')];
                            }
                            addr = account.address;
                            return [3, 3];
                        case 2:
                            addr = query.address;
                            _a.label = 3;
                        case 3: return [4, app.sdb.findAll('Vote', { condition: { address: addr } })];
                        case 4:
                            votes = _a.sent();
                            if (!votes || !votes.length) {
                                return [2, cb(null, { delegates: [] })];
                            }
                            delegateNames_1 = new Set();
                            for (_i = 0, votes_1 = votes; _i < votes_1.length; _i++) {
                                v = votes_1[_i];
                                delegateNames_1.add(v.delegate);
                            }
                            return [4, PIFY(modules.delegates.getDelegates)({})];
                        case 5:
                            delegates = _a.sent();
                            if (!delegates || !delegates.length) {
                                return [2, cb(null, { delegates: [] })];
                            }
                            myVotedDelegates = delegates.filter(function (d) { return delegateNames_1.has(d.name); });
                            return [2, cb(null, { delegates: myVotedDelegates })];
                        case 6:
                            e_2 = _a.sent();
                            library.logger.error('get voted delegates error', e_2);
                            return [2, cb('Server error')];
                        case 7: return [2];
                    }
                });
            });
        })();
    });
};
shared.getAccount = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            address: {
                type: 'string',
                minLength: 1,
                mexLength: 50,
            },
        },
        required: ['address'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var account, accountData, unconfirmedAccount, latestBlock, ret, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            return [4, app.sdb.findOne('Account', { condition: { address: query.address } })];
                        case 1:
                            account = _a.sent();
                            accountData = void 0;
                            if (!!account)
                                return [3, 2];
                            accountData = {
                                address: query.address,
                                unconfirmedBalance: 0,
                                balance: 0,
                                secondPublicKey: '',
                                lockHeight: 0,
                            };
                            return [3, 4];
                        case 2: return [4, app.sdb.load('Account', { address: account.address })];
                        case 3:
                            unconfirmedAccount = _a.sent();
                            accountData = {
                                address: account.address,
                                unconfirmedBalance: unconfirmedAccount.aec,
                                balance: account.aec,
                                secondPublicKey: account.secondPublicKey,
                                lockHeight: account.lockHeight || 0,
                            };
                            _a.label = 4;
                        case 4:
                            latestBlock = modules.blocks.getLastBlock();
                            ret = {
                                account: accountData,
                                latestBlock: {
                                    height: latestBlock.height,
                                    timestamp: latestBlock.timestamp,
                                },
                                version: modules.peer.getVersion(),
                            };
                            cb(null, ret);
                            return [3, 6];
                        case 5:
                            e_3 = _a.sent();
                            library.logger.error('Failed to get account', e_3);
                            cb('Server error');
                            return [3, 6];
                        case 6: return [2];
                    }
                });
            });
        })();
    });
};
module.exports = Accounts;
