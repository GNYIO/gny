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
var ed = require('../utils/ed.js');
var Router = require('../utils/router.js');
var slots = require('../utils/slots.js');
var BlockStatus = require('../utils/block-status.js');
var sandboxHelper = require('../utils/sandbox.js');
var addressHelper = require('../utils/address.js');
var constants = require('../utils/constants.js');
var modules;
var library;
var self;
var priv = {};
var shared = {};
var BOOK_KEEPER_NAME = 'round_bookkeeper';
priv.loaded = false;
priv.blockStatus = new BlockStatus();
priv.keypairs = {};
priv.forgingEanbled = true;
function Delegates(cb, scope) {
    library = scope;
    self = this;
    priv.attachApi();
    setImmediate(cb, null, self);
}
priv.attachApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules && priv.loaded)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.map(shared, {
        'get /count': 'count',
        'get /voters': 'getVoters',
        'get /get': 'getDelegate',
        'get /': 'getDelegates',
    });
    if (process.env.DEBUG) {
        router.get('/forging/disableAll', function (req, res) {
            self.disableForging();
            return res.json({ success: true });
        });
        router.get('/forging/enableAll', function (req, res) {
            self.enableForging();
            return res.json({ success: true });
        });
    }
    router.post('/forging/enable', function (req, res) {
        var body = req.body;
        library.scheme.validate(body, {
            type: 'object',
            properties: {
                secret: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                },
                publicKey: {
                    type: 'string',
                    format: 'publicKey',
                },
            },
            required: ['secret'],
        }, function (err) {
            if (err) {
                return res.json({ success: false, error: err[0].message });
            }
            var ip = req.connection.remoteAddress;
            if (library.config.forging.access.whiteList.length > 0
                && library.config.forging.access.whiteList.indexOf(ip) < 0) {
                return res.json({ success: false, error: 'Access denied' });
            }
            var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
            if (body.publicKey) {
                if (keypair.publicKey.toString('hex') !== body.publicKey) {
                    return res.json({ success: false, error: 'Invalid passphrase' });
                }
            }
            if (priv.keypairs[keypair.publicKey.toString('hex')]) {
                return res.json({ success: false, error: 'Forging is already enabled' });
            }
            return modules.accounts.getAccount({ publicKey: keypair.publicKey.toString('hex') }, function (err2, account) {
                if (err2) {
                    return res.json({ success: false, error: err2.toString() });
                }
                if (account && account.isDelegate) {
                    priv.keypairs[keypair.publicKey.toString('hex')] = keypair;
                    library.logger.info("Forging enabled on account: " + account.address);
                    return res.json({ success: true, address: account.address });
                }
                return res.json({ success: false, error: 'Delegate not found' });
            });
        });
    });
    router.post('/forging/disable', function (req, res) {
        var body = req.body;
        library.scheme.validate(body, {
            type: 'object',
            properties: {
                secret: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                },
                publicKey: {
                    type: 'string',
                    format: 'publicKey',
                },
            },
            required: ['secret'],
        }, function (err) {
            if (err) {
                return res.json({ success: false, error: err[0].message });
            }
            var ip = req.connection.remoteAddress;
            if (library.config.forging.access.whiteList.length > 0
                && library.config.forging.access.whiteList.indexOf(ip) < 0) {
                return res.json({ success: false, error: 'Access denied' });
            }
            var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());
            if (body.publicKey) {
                if (keypair.publicKey.toString('hex') !== body.publicKey) {
                    return res.json({ success: false, error: 'Invalid passphrase' });
                }
            }
            if (!priv.keypairs[keypair.publicKey.toString('hex')]) {
                return res.json({ success: false, error: 'Delegate not found' });
            }
            return modules.accounts.getAccount({ publicKey: keypair.publicKey.toString('hex') }, function (err2, account) {
                if (err2) {
                    return res.json({ success: false, error: err2.toString() });
                }
                if (account && account.isDelegate) {
                    delete priv.keypairs[keypair.publicKey.toString('hex')];
                    library.logger.info("Forging disabled on account: " + account.address);
                    return res.json({ success: true, address: account.address });
                }
                return res.json({ success: false, error: 'Delegate not found' });
            });
        });
    });
    router.get('/forging/status', function (req, res) {
        var query = req.query;
        library.scheme.validate(query, {
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
                return res.json({ success: false, error: err[0].message });
            }
            return res.json({ success: true, enabled: !!priv.keypairs[query.publicKey] });
        });
    });
    library.network.app.use('/api/delegates', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
priv.getBlockSlotData = function (slot, height, cb) {
    self.generateDelegateList(height, function (err, activeDelegates) {
        if (err) {
            return cb(err);
        }
        var lastSlot = slots.getLastSlot(slot);
        for (var currentSlot = slot; currentSlot < lastSlot; currentSlot += 1) {
            var delegatePos = currentSlot % slots.delegates;
            var delegateKey = activeDelegates[delegatePos];
            if (delegateKey && priv.keypairs[delegateKey]) {
                return cb(null, {
                    time: slots.getSlotTime(currentSlot),
                    keypair: priv.keypairs[delegateKey],
                });
            }
        }
        return cb(null, null);
    });
};
priv.loop = function (cb) {
    if (!priv.forgingEanbled) {
        library.logger.trace('Loop:', 'forging disabled');
        return setImmediate(cb);
    }
    if (!Object.keys(priv.keypairs).length) {
        library.logger.trace('Loop:', 'no delegates');
        return setImmediate(cb);
    }
    if (!priv.loaded || modules.loader.syncing()) {
        library.logger.trace('Loop:', 'node not ready');
        return setImmediate(cb);
    }
    var currentSlot = slots.getSlotNumber();
    var lastBlock = modules.blocks.getLastBlock();
    if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
        return setImmediate(cb);
    }
    if (Date.now() % (constants.interval * 1000) > 5000) {
        library.logger.trace('Loop:', 'maybe too late to collect votes');
        return setImmediate(cb);
    }
    return priv.getBlockSlotData(currentSlot, lastBlock.height + 1, function (err, currentBlockData) {
        if (err || currentBlockData === null) {
            library.logger.trace('Loop:', 'skipping slot');
            return setImmediate(cb);
        }
        return library.sequence.add(function (done) {
            return (function () {
                return __awaiter(_this, void 0, void 0, function () {
                    var e_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 3, , 4]);
                                if (!(slots.getSlotNumber(currentBlockData.time) === slots.getSlotNumber()
                                    && modules.blocks.getLastBlock().timestamp < currentBlockData.time))
                                    return [3, 2];
                                return [4, modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time)];
                            case 1:
                                _a.sent();
                                _a.label = 2;
                            case 2:
                                done();
                                return [3, 4];
                            case 3:
                                e_1 = _a.sent();
                                done(e_1);
                                return [3, 4];
                            case 4: return [2];
                        }
                    });
                });
            })();
        }, function (err2) {
            if (err2) {
                library.logger.error('Failed generate block within slot:', err2);
            }
            cb();
        });
    });
};
priv.loadMyDelegates = function (cb) {
    var secrets = [];
    if (library.config.forging.secret) {
        secrets = util.isArray(library.config.forging.secret)
            ? library.config.forging.secret : [library.config.forging.secret];
    }
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var delegates, delegateMap, _i, delegates_1, d, _a, secrets_1, secret, keypair, publicKey;
            return __generator(this, function (_b) {
                try {
                    delegates = app.sdb.getAll('Delegate');
                    if (!delegates || !delegates.length) {
                        return [2, cb('Delegates not found in db')];
                    }
                    delegateMap = new Map();
                    for (_i = 0, delegates_1 = delegates; _i < delegates_1.length; _i++) {
                        d = delegates_1[_i];
                        delegateMap.set(d.publicKey, d);
                    }
                    for (_a = 0, secrets_1 = secrets; _a < secrets_1.length; _a++) {
                        secret = secrets_1[_a];
                        keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
                        publicKey = keypair.publicKey.toString('hex');
                        if (delegateMap.has(publicKey)) {
                            priv.keypairs[publicKey] = keypair;
                            library.logger.info("Forging enabled on account: " + delegateMap.get(publicKey).address);
                        }
                        else {
                            library.logger.info("Delegate with this public key not found: " + keypair.publicKey.toString('hex'));
                        }
                    }
                    return [2, cb()];
                }
                catch (e) {
                    return [2, cb(e)];
                }
                return [2];
            });
        });
    })();
};
Delegates.prototype.getActiveDelegateKeypairs = function (height, cb) {
    self.generateDelegateList(height, function (err, delegates) {
        if (err) {
            return cb(err);
        }
        var results = [];
        for (var key in priv.keypairs) {
            if (delegates.indexOf(key) !== -1) {
                results.push(priv.keypairs[key]);
            }
        }
        return cb(null, results);
    });
};
Delegates.prototype.validateProposeSlot = function (propose, cb) {
    self.generateDelegateList(propose.height, function (err, activeDelegates) {
        if (err) {
            return cb(err);
        }
        var currentSlot = slots.getSlotNumber(propose.timestamp);
        var delegateKey = activeDelegates[currentSlot % slots.delegates];
        if (delegateKey && propose.generatorPublicKey === delegateKey) {
            return cb();
        }
        return cb('Failed to validate propose slot');
    });
};
Delegates.prototype.generateDelegateList = function (height, cb) {
    return (function () {
        try {
            var truncDelegateList = self.getBookkeeper();
            var seedSource = modules.round.calc(height).toString();
            var currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest();
            for (var i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
                for (var x = 0; x < 4 && i < delCount; i++, x++) {
                    var newIndex = currentSeed[x] % delCount;
                    var b = truncDelegateList[newIndex];
                    truncDelegateList[newIndex] = truncDelegateList[i];
                    truncDelegateList[i] = b;
                }
                currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
            }
            cb(null, truncDelegateList);
        }
        catch (e) {
            cb("Failed to get bookkeeper: " + e);
        }
    })();
};
Delegates.prototype.fork = function (block, cause) {
    library.logger.info('Fork', {
        delegate: block.delegate,
        block: {
            id: block.id,
            timestamp: block.timestamp,
            height: block.height,
            prevBlockId: block.prevBlockId,
        },
        cause: cause,
    });
};
Delegates.prototype.validateBlockSlot = function (block, cb) {
    self.generateDelegateList(block.height, function (err, activeDelegates) {
        if (err) {
            return cb(err);
        }
        var currentSlot = slots.getSlotNumber(block.timestamp);
        var delegateKey = activeDelegates[currentSlot % 101];
        if (delegateKey && block.delegate === delegateKey) {
            return cb();
        }
        return cb("Failed to verify slot, expected delegate: " + delegateKey);
    });
};
Delegates.prototype.getDelegates = function (query, cb) {
    var delegates = app.sdb.getAll('Delegate').map(function (d) { return Object.assign({}, d); });
    if (!delegates || !delegates.length)
        return cb('No delegates');
    delegates = delegates.sort(self.compare);
    var lastBlock = modules.blocks.getLastBlock();
    var totalSupply = priv.blockStatus.calcSupply(lastBlock.height);
    for (var i = 0; i < delegates.length; ++i) {
        var d = delegates[i];
        d.rate = i + 1;
        delegates[i].approval = ((d.votes / totalSupply) * 100);
        var percent = 100 - (d.missedBlocks / (d.producedBlocks + d.missedBlocks) / 100);
        percent = percent || 0;
        delegates[i].productivity = parseFloat(Math.floor(percent * 100) / 100).toFixed(2);
        delegates[i].vote = delegates[i].votes;
        delegates[i].missedblocks = delegates[i].missedBlocks;
        delegates[i].producedblocks = delegates[i].producedBlocks;
        app.sdb.update('Delegate', delegates[i], { address: delegates[i].address });
    }
    return cb(null, delegates);
};
Delegates.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Delegates.prototype.enableForging = function () {
    priv.forgingEanbled = true;
};
Delegates.prototype.disableForging = function () {
    priv.forgingEanbled = false;
};
Delegates.prototype.onBind = function (scope) {
    modules = scope;
};
Delegates.prototype.onBlockchainReady = function () {
    priv.loaded = true;
    priv.loadMyDelegates(function nextLoop(err) {
        if (err) {
            library.logger.error('Failed to load delegates', err);
        }
        priv.loop(function () {
            setTimeout(nextLoop, 100);
        });
    });
};
Delegates.prototype.compare = function (l, r) {
    if (l.votes !== r.votes) {
        return r.votes - l.votes;
    }
    return l.publicKey < r.publicKey ? 1 : -1;
};
Delegates.prototype.cleanup = function (cb) {
    priv.loaded = false;
    cb();
};
Delegates.prototype.getTopDelegates = function () {
    var allDelegates = app.sdb.getAll('Delegate');
    return allDelegates.sort(self.compare).map(function (d) { return d.publicKey; }).slice(0, 101);
};
Delegates.prototype.getBookkeeperAddresses = function () {
    var bookkeeper = self.getBookkeeper();
    var addresses = new Set();
    for (var _i = 0, bookkeeper_1 = bookkeeper; _i < bookkeeper_1.length; _i++) {
        var i = bookkeeper_1[_i];
        var address = addressHelper.generateNormalAddress(i);
        addresses.add(address);
    }
    return addresses;
};
Delegates.prototype.getBookkeeper = function () {
    var item = app.sdb.get('Variable', BOOK_KEEPER_NAME);
    if (!item)
        throw new Error('Bookkeeper variable not found');
    return JSON.parse(item.value);
};
Delegates.prototype.updateBookkeeper = function (delegates) {
    var value = JSON.stringify(delegates || self.getTopDelegates());
    var create = app.sdb.createOrLoad('Variable', { key: BOOK_KEEPER_NAME, value: value }).create;
    if (!create) {
        app.sdb.update('Variable', { value: value }, { key: BOOK_KEEPER_NAME });
    }
};
shared.getDelegate = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            publicKey: {
                type: 'string',
            },
            name: {
                type: 'string',
            },
            address: {
                type: 'string',
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return modules.delegates.getDelegates(query, function (err2, delegates) {
            if (err2) {
                return cb(err2);
            }
            var delegate = delegates.find(function (d) {
                if (query.publicKey) {
                    return d.publicKey === query.publicKey;
                }
                if (query.address) {
                    return d.address === query.address;
                }
                if (query.name) {
                    return d.name === query.name;
                }
                return false;
            });
            if (delegate) {
                return cb(null, { delegate: delegate });
            }
            return cb('Delegate not found');
        });
    });
};
shared.count = function (req, cb) {
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var count;
            return __generator(this, function (_a) {
                try {
                    count = app.sdb.getAll('Delegate').length;
                    return [2, cb(null, { count: count })];
                }
                catch (e) {
                    library.logger.error('get delegate count error', e);
                    return [2, cb('Failed to count delegates')];
                }
                return [2];
            });
        });
    })();
};
shared.getVoters = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                maxLength: 50,
            },
        },
        required: ['name'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var votes, addresses, accounts, lastBlock, totalSupply, _i, accounts_1, a, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4, app.sdb.findAll('Vote', { condition: { delegate: query.name } })];
                        case 1:
                            votes = _a.sent();
                            if (!votes || !votes.length)
                                return [2, cb(null, { accounts: [] })];
                            addresses = votes.map(function (v) { return v.address; });
                            return [4, app.sdb.findAll('Account', { condition: { address: { $in: addresses } } })];
                        case 2:
                            accounts = _a.sent();
                            lastBlock = modules.blocks.getLastBlock();
                            totalSupply = priv.blockStatus.calcSupply(lastBlock.height);
                            for (_i = 0, accounts_1 = accounts; _i < accounts_1.length; _i++) {
                                a = accounts_1[_i];
                                a.balance = a.aec;
                                a.weightRatio = (a.weight * 100) / totalSupply;
                            }
                            return [2, cb(null, { accounts: accounts })];
                        case 3:
                            e_2 = _a.sent();
                            library.logger.error('Failed to find voters', e_2);
                            return [2, cb('Server error')];
                        case 4: return [2];
                    }
                });
            });
        })();
    });
};
shared.getDelegates = function (req, cb) {
    var query = req.body;
    var offset = Number(query.offset || 0);
    var limit = Number(query.limit || 0);
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
        return cb('Invalid params');
    }
    return self.getDelegates({}, function (err, delegates) {
        if (err)
            return cb(err);
        return cb(null, {
            totalCount: delegates.length,
            delegates: delegates.slice(offset, offset + limit),
        });
    });
};
module.exports = Delegates;
