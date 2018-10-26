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
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var slots = require('../utils/slots.js');
var constants = require('../utils/constants.js');
require('colors');
var modules;
var library;
var self;
var priv = {};
var shared = {};
priv.loaded = false;
priv.syncing = false;
priv.loadingLastBlock = null;
priv.genesisBlock = null;
priv.total = 0;
priv.blocksToSync = 0;
priv.syncIntervalId = null;
function Loader(cb, scope) {
    library = scope;
    priv.genesisBlock = library.genesisblock;
    priv.loadingLastBlock = library.genesisblock;
    self = this;
    priv.attachApi();
    setImmediate(cb, null, self);
}
priv.attachApi = function () {
    var router = new Router();
    router.map(shared, {
        'get /status': 'status',
        'get /status/sync': 'sync',
    });
    library.network.app.use('/api/loader', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
priv.syncTrigger = function (turnOn) {
    if (turnOn === false && priv.syncIntervalId) {
        clearTimeout(priv.syncIntervalId);
        priv.syncIntervalId = null;
    }
    if (turnOn === true && !priv.syncIntervalId) {
        setImmediate(function nextSyncTrigger() {
            library.network.io.sockets.emit('loader/sync', {
                blocks: priv.blocksToSync,
                height: modules.blocks.getLastBlock().height,
            });
            priv.syncIntervalId = setTimeout(nextSyncTrigger, 1000);
        });
    }
};
priv.loadFullDb = function (peer, cb) {
    var peerStr = peer.host + ":" + (peer.port - 1);
    var commonBlockId = priv.genesisBlock.block.id;
    library.logger.debug("Loading blocks from genesis from " + peerStr);
    modules.blocks.loadBlocksFromPeer(peer, commonBlockId, cb);
};
priv.findUpdate = function (lastBlock, peer, cb) {
    var peerStr = peer.host + ":" + (peer.port - 1);
    library.logger.info("Looking for common block with " + peerStr);
    modules.blocks.getCommonBlock(peer, lastBlock.height, function (err, commonBlock) {
        if (err || !commonBlock) {
            library.logger.error('Failed to get common block:', err);
            return cb();
        }
        library.logger.info("Found common block " + commonBlock.id + " (at " + commonBlock.height + ")\n      with peer " + peerStr + ", last block height is " + lastBlock.height);
        var toRemove = lastBlock.height - commonBlock.height;
        if (toRemove >= 5) {
            library.logger.error("long fork with peer " + peerStr);
            return cb();
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            modules.transactions.clearUnconfirmed();
                            if (!(toRemove > 0))
                                return [3, 2];
                            return [4, app.sdb.rollbackBlock(commonBlock.height)];
                        case 1:
                            _a.sent();
                            modules.blocks.setLastBlock(app.sdb.lastBlock);
                            library.logger.debug('set new last block', app.sdb.lastBlock);
                            return [3, 4];
                        case 2: return [4, app.sdb.rollbackBlock()];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [3, 6];
                        case 5:
                            e_1 = _a.sent();
                            library.logger.error('Failed to rollback block', e_1);
                            return [2, cb()];
                        case 6:
                            library.logger.debug("Loading blocks from peer " + peerStr);
                            return [2, modules.blocks.loadBlocksFromPeer(peer, commonBlock.id, function (err2) {
                                    if (err) {
                                        library.logger.error("Failed to load blocks, ban 60 min: " + peerStr, err2);
                                    }
                                    cb();
                                })];
                    }
                });
            });
        })();
    });
};
priv.loadBlocks = function (lastBlock, cb) {
    modules.peer.randomRequest('getHeight', {}, function (err, ret, peer) {
        if (err) {
            library.logger.error('Failed to request form random peer', err);
            return cb();
        }
        var peerStr = peer.host + ":" + (peer.port - 1);
        library.logger.info("Check blockchain on " + peerStr);
        ret.height = Number.parseInt(ret.height, 10);
        var report = library.scheme.validate(ret, {
            type: 'object',
            properties: {
                height: {
                    type: 'integer',
                    minimum: 0,
                },
            },
            required: ['height'],
        });
        if (!report) {
            library.logger.info("Failed to parse blockchain height: " + peerStr + "\n" + library.scheme.getLastError());
            return cb();
        }
        if (app.util.bignumber(lastBlock.height).lt(ret.height)) {
            priv.blocksToSync = ret.height;
            if (lastBlock.id !== priv.genesisBlock.block.id) {
                return priv.findUpdate(lastBlock, peer, cb);
            }
            return priv.loadFullDb(peer, cb);
        }
        return cb();
    });
};
priv.loadUnconfirmedTransactions = function (cb) {
    modules.peer.randomRequest('getUnconfirmedTransactions', {}, function (err, data, peer) {
        if (err) {
            return cb();
        }
        var report = library.scheme.validate(data.body, {
            type: 'object',
            properties: {
                transactions: {
                    type: 'array',
                    uniqueItems: true,
                },
            },
            required: ['transactions'],
        });
        if (!report) {
            return cb();
        }
        var transactions = data.body.transactions;
        var peerStr = peer.host + ":" + (peer.port - 1);
        for (var i = 0; i < transactions.length; i++) {
            try {
                transactions[i] = library.base.transaction.objectNormalize(transactions[i]);
            }
            catch (e) {
                library.logger.info("Transaction " + (transactions[i] ? transactions[i].id : 'null') + " is not valid, ban 60 min", peerStr);
                return cb();
            }
        }
        var trs = [];
        for (var i = 0; i < transactions.length; ++i) {
            if (!modules.transactions.hasUnconfirmed(transactions[i])) {
                trs.push(transactions[i]);
            }
        }
        library.logger.info("Loading " + transactions.length + " unconfirmed transaction from peer " + peerStr);
        return library.sequence.add(function (done) {
            modules.transactions.processUnconfirmedTransactions(trs, done);
        }, cb);
    });
};
Loader.prototype.syncing = function () { return priv.syncing; };
Loader.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Loader.prototype.startSyncBlocks = function () {
    library.logger.debug('startSyncBlocks enter');
    if (!priv.loaded || self.syncing()) {
        library.logger.debug('blockchain is already syncing');
        return;
    }
    library.sequence.add(function (cb) {
        library.logger.debug('startSyncBlocks enter sequence');
        priv.syncing = true;
        var lastBlock = modules.blocks.getLastBlock();
        priv.loadBlocks(lastBlock, function (err) {
            if (err) {
                library.logger.error('loadBlocks error:', err);
            }
            priv.syncing = false;
            priv.blocksToSync = 0;
            library.logger.debug('startSyncBlocks end');
            cb();
        });
    });
};
Loader.prototype.syncBlocksFromPeer = function (peer) {
    library.logger.debug('syncBlocksFromPeer enter');
    if (!priv.loaded || self.syncing()) {
        library.logger.debug('blockchain is already syncing');
        return;
    }
    library.sequence.add(function (cb) {
        library.logger.debug('syncBlocksFromPeer enter sequence');
        priv.syncing = true;
        var lastBlock = modules.blocks.getLastBlock();
        modules.transactions.clearUnconfirmed();
        app.sdb.rollbackBlock().then(function () {
            modules.blocks.loadBlocksFromPeer(peer, lastBlock.id, function (err) {
                if (err) {
                    library.logger.error('syncBlocksFromPeer error:', err);
                }
                priv.syncing = false;
                library.logger.debug('syncBlocksFromPeer end');
                cb();
            });
        });
    });
};
Loader.prototype.onPeerReady = function () {
    setImmediate(function nextSync() {
        var lastBlock = modules.blocks.getLastBlock();
        var lastSlot = slots.getSlotNumber(lastBlock.timestamp);
        if (slots.getNextSlot() - lastSlot >= 3) {
            self.startSyncBlocks();
        }
        setTimeout(nextSync, constants.interval * 1000);
    });
    setImmediate(function () {
        if (!priv.loaded || self.syncing())
            return;
        priv.loadUnconfirmedTransactions(function (err) {
            if (err) {
                library.logger.error('loadUnconfirmedTransactions timer:', err);
            }
        });
    });
};
Loader.prototype.onBind = function (scope) {
    modules = scope;
};
Loader.prototype.onBlockchainReady = function () {
    priv.loaded = true;
};
Loader.prototype.cleanup = function (cb) {
    priv.loaded = false;
    cb();
};
shared.status = function (req, cb) {
    cb(null, {
        loaded: priv.loaded,
        now: priv.loadingLastBlock.height,
        blocksCount: priv.total,
    });
};
shared.sync = function (req, cb) {
    cb(null, {
        syncing: self.syncing(),
        blocks: priv.blocksToSync,
        height: modules.blocks.getLastBlock().height,
    });
};
module.exports = Loader;
