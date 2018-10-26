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
var assert = require('assert');
var crypto = require('crypto');
var async = require('async');
var PIFY = require('util').promisify;
var isArray = require('util').isArray;
var constants = require('../utils/constants.js');
var BlockStatus = require('../utils/block-status.js');
var Router = require('../utils/router.js');
var slots = require('../utils/slots.js');
var sandboxHelper = require('../utils/sandbox.js');
var addressHelper = require('../utils/address.js');
var transactionMode = require('../utils/transaction-mode.js');
var genesisblock = null;
var modules;
var library;
var self;
var priv = {};
var shared = {};
priv.lastBlock = {};
priv.blockStatus = new BlockStatus();
priv.loaded = false;
priv.isActive = false;
priv.blockCache = {};
priv.proposeCache = {};
priv.lastPropose = null;
priv.isCollectingVotes = false;
function Blocks(cb, scope) {
    library = scope;
    genesisblock = library.genesisblock;
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
        'get /get': 'getBlock',
        'get /full': 'getFullBlock',
        'get /': 'getBlocks',
        'get /getHeight': 'getHeight',
        'get /getMilestone': 'getMilestone',
        'get /getReward': 'getReward',
        'get /getSupply': 'getSupply',
        'get /getStatus': 'getStatus',
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/blocks', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
priv.getIdSequence2 = function (height, cb) {
    (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var maxHeight, minHeight, blocks, ids, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        maxHeight = Math.max(height, priv.lastBlock.height);
                        minHeight = Math.max(0, maxHeight - 4);
                        return [4, app.sdb.getBlocksByHeightRange(minHeight, maxHeight)];
                    case 1:
                        blocks = _a.sent();
                        blocks = blocks.reverse();
                        ids = blocks.map(function (b) { return b.id; });
                        return [2, cb(null, { ids: ids, firstHeight: minHeight })];
                    case 2:
                        e_1 = _a.sent();
                        return [2, cb(e_1)];
                    case 3: return [2];
                }
            });
        });
    })();
};
Blocks.prototype.toAPIV1Blocks = function (blocks) {
    if (blocks && isArray(blocks) && blocks.length > 0) {
        return blocks.map(function (b) { return self.toAPIV1Block(b); });
    }
    return [];
};
Blocks.prototype.toAPIV1Block = function (block) {
    if (!block)
        return undefined;
    return {
        id: block.id,
        version: block.version,
        timestamp: block.timestamp,
        height: Number(block.height),
        payloadHash: block.payloadHash,
        previousBlock: block.prevBlockId,
        numberOfTransactions: block.count,
        totalFee: block.fees,
        generatorPublicKey: block.delegate,
        blockSignature: block.signature,
        confirmations: self.getLastBlock().height - block.height,
        transactions: !block.transactions ? undefined : modules.transactions.toAPIV1Transactions(block.transactions.filter(function (t) { return t.executed; }), block),
    };
};
Blocks.prototype.getCommonBlock = function (peer, height, cb) {
    var lastBlockHeight = height;
    priv.getIdSequence2(lastBlockHeight, function (err, data) {
        if (err) {
            return cb("Failed to get last block id sequence" + err);
        }
        library.logger.trace('getIdSequence=========', data);
        var params = {
            max: lastBlockHeight,
            min: data.firstHeight,
            ids: data.ids,
        };
        return modules.peer.request('commonBlock', params, peer, function (err2, ret) {
            if (err2 || ret.error) {
                return cb(err2 || ret.error.toString());
            }
            if (!ret.common) {
                return cb('Common block not found');
            }
            return cb(null, ret.common);
        });
    });
};
Blocks.prototype.getBlock = function (filter, cb) {
    shared.getBlock({ body: filter }, cb);
};
Blocks.prototype.setLastBlock = function (block) {
    priv.lastBlock = block;
    global.featureSwitch.enableLongId = true;
    global.featureSwitch.enable1_3_0 = true;
    global.featureSwitch.enableClubBonus = (!!global.state.clubInfo);
    global.featureSwitch.enableMoreLockTypes = true;
    global.featureSwitch.enableLockReset = true;
    global.featureSwitch.fixVoteNewAddressIssue = true;
    global.featureSwitch.enableUIA = global.featureSwitch.enableLongId;
};
Blocks.prototype.getLastBlock = function () { return priv.lastBlock; };
Blocks.prototype.verifyBlock = function (block, options) {
    return __awaiter(_this, void 0, void 0, function () {
        var blockSlotNumber, lastBlockSlotNumber, payloadHash, appliedTransactions, totalFee, _i, _a, transaction, bytes, expectedReward, votes;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    try {
                        block.id = library.base.block.getId(block);
                    }
                    catch (e) {
                        throw new Error("Failed to get block id: " + e.toString());
                    }
                    library.logger.debug("verifyBlock, id: " + block.id + ", h: " + block.height);
                    if (!block.prevBlockId && block.height !== 0) {
                        throw new Error('Previous block should not be null');
                    }
                    try {
                        if (!library.base.block.verifySignature(block)) {
                            throw new Error('Failed to verify block signature');
                        }
                    }
                    catch (e) {
                        library.logger.error({ e: e, block: block });
                        throw new Error("Got exception while verify block signature: " + e.toString());
                    }
                    if (block.prevBlockId !== priv.lastBlock.id) {
                        throw new Error('Incorrect previous block hash');
                    }
                    if (block.height !== 0) {
                        blockSlotNumber = slots.getSlotNumber(block.timestamp);
                        lastBlockSlotNumber = slots.getSlotNumber(priv.lastBlock.timestamp);
                        if (blockSlotNumber > slots.getSlotNumber() + 1 || blockSlotNumber <= lastBlockSlotNumber) {
                            throw new Error("Can't verify block timestamp: " + block.id);
                        }
                    }
                    if (block.transactions.length > constants.maxTxsPerBlock) {
                        throw new Error("Invalid amount of block assets: " + block.id);
                    }
                    if (block.transactions.length !== block.count) {
                        throw new Error('Invalid transaction count');
                    }
                    payloadHash = crypto.createHash('sha256');
                    appliedTransactions = {};
                    totalFee = 0;
                    for (_i = 0, _a = block.transactions; _i < _a.length; _i++) {
                        transaction = _a[_i];
                        totalFee += transaction.fee;
                        bytes = void 0;
                        try {
                            bytes = library.base.transaction.getBytes(transaction);
                        }
                        catch (e) {
                            throw new Error("Failed to get transaction bytes: " + e.toString());
                        }
                        if (appliedTransactions[transaction.id]) {
                            throw new Error("Duplicate transaction id in block " + block.id);
                        }
                        appliedTransactions[transaction.id] = transaction;
                        payloadHash.update(bytes);
                    }
                    if (totalFee !== block.fees) {
                        throw new Error('Invalid total fees');
                    }
                    expectedReward = priv.blockStatus.calcReward(block.height);
                    if (expectedReward !== block.reward) {
                        throw new Error('Invalid block reward');
                    }
                    if (payloadHash.digest().toString('hex') !== block.payloadHash) {
                        throw new Error("Invalid payload hash: " + block.id);
                    }
                    if (!options.votes)
                        return [3, 2];
                    votes = options.votes;
                    if (block.height !== votes.height) {
                        throw new Error('Votes height is not correct');
                    }
                    if (block.id !== votes.id) {
                        throw new Error('Votes id is not correct');
                    }
                    if (!votes.signatures || !library.base.consensus.hasEnoughVotesRemote(votes)) {
                        throw new Error('Votes signature is not correct');
                    }
                    return [4, self.verifyBlockVotes(block, votes)];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2: return [2];
            }
        });
    });
};
Blocks.prototype.verifyBlockVotes = function (block, votes) {
    return __awaiter(_this, void 0, void 0, function () {
        var delegateList, publicKeySet, _i, _a, item;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4, PIFY(modules.delegates.generateDelegateList)(block.height)];
                case 1:
                    delegateList = _b.sent();
                    publicKeySet = new Set(delegateList);
                    for (_i = 0, _a = votes.signatures; _i < _a.length; _i++) {
                        item = _a[_i];
                        if (!publicKeySet.has(item.key.toString('hex'))) {
                            throw new Error("Votes key is not in the top list: " + item.key);
                        }
                        if (!library.base.consensus.verifyVote(votes.height, votes.id, item)) {
                            throw new Error('Failed to verify vote signature');
                        }
                    }
                    return [2];
            }
        });
    });
};
Blocks.prototype.applyBlock = function (block) {
    return __awaiter(_this, void 0, void 0, function () {
        var appliedTransactions, _i, _a, transaction, e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    app.logger.trace('enter applyblock');
                    appliedTransactions = {};
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 8]);
                    _i = 0, _a = block.transactions;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length))
                        return [3, 5];
                    transaction = _a[_i];
                    if (appliedTransactions[transaction.id]) {
                        throw new Error("Duplicate transaction in block: " + transaction.id);
                    }
                    return [4, modules.transactions.applyUnconfirmedTransactionAsync(transaction)];
                case 3:
                    _b.sent();
                    appliedTransactions[transaction.id] = transaction;
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3, 2];
                case 5: return [3, 8];
                case 6:
                    e_2 = _b.sent();
                    app.logger.error(e_2);
                    return [4, app.sdb.rollbackBlock()];
                case 7:
                    _b.sent();
                    throw new Error("Failed to apply block: " + e_2);
                case 8: return [2];
            }
        });
    });
};
Blocks.prototype.processBlock = function (b, options) {
    return __awaiter(_this, void 0, void 0, function () {
        var block, exists, _a, e_3, _i, _b, transaction, idList, e_4, trsCount, e_5;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!priv.loaded)
                        throw new Error('Blockchain is loading');
                    block = b;
                    app.sdb.beginBlock(block);
                    if (!block.transactions)
                        block.transactions = [];
                    if (!!options.local)
                        return [3, 13];
                    try {
                        block = library.base.block.objectNormalize(block);
                    }
                    catch (e) {
                        library.logger.error("Failed to normalize block: " + e, block);
                        throw e;
                    }
                    return [4, self.verifyBlock(block, options)];
                case 1:
                    _c.sent();
                    library.logger.debug('verify block ok');
                    if (!(block.height !== 0))
                        return [3, 3];
                    _a = undefined;
                    return [4, app.sdb.getBlockById(block.id)];
                case 2:
                    exists = (_a !== (_c.sent()));
                    if (exists)
                        throw new Error("Block already exists: " + block.id);
                    _c.label = 3;
                case 3:
                    if (!(block.height !== 0))
                        return [3, 8];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4, PIFY(modules.delegates.validateBlockSlot)(block)];
                case 5:
                    _c.sent();
                    return [3, 7];
                case 6:
                    e_3 = _c.sent();
                    library.logger.error(e_3);
                    throw new Error("Can't verify slot: " + e_3);
                case 7:
                    library.logger.debug('verify block slot ok');
                    _c.label = 8;
                case 8:
                    for (_i = 0, _b = block.transactions; _i < _b.length; _i++) {
                        transaction = _b[_i];
                        library.base.transaction.objectNormalize(transaction);
                    }
                    idList = block.transactions.map(function (t) { return t.id; });
                    return [4, app.sdb.exists('Transaction', { id: { $in: idList } })];
                case 9:
                    if (_c.sent()) {
                        throw new Error('Block contain already confirmed transaction');
                    }
                    app.logger.trace('before applyBlock');
                    _c.label = 10;
                case 10:
                    _c.trys.push([10, 12, , 13]);
                    return [4, self.applyBlock(block, options)];
                case 11:
                    _c.sent();
                    return [3, 13];
                case 12:
                    e_4 = _c.sent();
                    app.logger.error("Failed to apply block: " + e_4);
                    throw e_4;
                case 13:
                    _c.trys.push([13, 16, 18, 19]);
                    self.saveBlockTransactions(block);
                    return [4, self.applyRound(block)];
                case 14:
                    _c.sent();
                    return [4, app.sdb.commitBlock()];
                case 15:
                    _c.sent();
                    trsCount = block.transactions.length;
                    app.logger.info("Block applied correctly with " + trsCount + " transactions");
                    self.setLastBlock(block);
                    if (options.broadcast) {
                        options.votes.signatures = options.votes.signatures.slice(0, 6);
                        library.bus.message('newBlock', block, options.votes);
                    }
                    library.bus.message('processBlock', block);
                    return [3, 19];
                case 16:
                    e_5 = _c.sent();
                    app.logger.error(block);
                    app.logger.error('save block error: ', e_5);
                    return [4, app.sdb.rollbackBlock()];
                case 17:
                    _c.sent();
                    throw new Error("Failed to save block: " + e_5);
                case 18:
                    priv.blockCache = {};
                    priv.proposeCache = {};
                    priv.lastVoteTime = null;
                    priv.isCollectingVotes = false;
                    library.base.consensus.clearState();
                    return [7];
                case 19: return [2];
            }
        });
    });
};
Blocks.prototype.saveBlockTransactions = function (block) {
    app.logger.trace('Blocks#saveBlockTransactions height', block.height);
    for (var _i = 0, _a = block.transactions; _i < _a.length; _i++) {
        var trs = _a[_i];
        trs.height = block.height;
        app.sdb.create('Transaction', trs);
    }
    app.logger.trace('Blocks#save transactions');
};
Blocks.prototype.increaseRoundData = function (modifier, roundNumber) {
    app.sdb.createOrLoad('Round', { fees: 0, rewards: 0, round: roundNumber });
    return app.sdb.increase('Round', modifier, { round: roundNumber });
};
Blocks.prototype.applyRound = function (block) {
    return __awaiter(_this, void 0, void 0, function () {
        function updateDelegate(pk, fee, reward) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    address = addressHelper.generateNormalAddress(pk);
                    app.sdb.increase('Delegate', { fees: fee, rewards: reward }, { address: address });
                    app.sdb.increase('Account', { aec: fee + reward }, { address: address });
                    return [2];
                });
            });
        }
        var address, transFee, _i, _a, t, roundNumber, _b, fees, rewards, delegates, forgedBlocks, forgedDelegates, missedDelegates, councilControl, councilAddress, ratio, actualFees, feeAverage, feeRemainder, actualRewards, rewardAverage, rewardRemainder, _c, forgedDelegates_1, fd;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (block.height === 0) {
                        modules.delegates.updateBookkeeper();
                        return [2];
                    }
                    address = addressHelper.generateNormalAddress(block.delegate);
                    app.sdb.increase('Delegate', { producedBlocks: 1 }, { address: address });
                    transFee = 0;
                    for (_i = 0, _a = block.transactions; _i < _a.length; _i++) {
                        t = _a[_i];
                        if (transactionMode.isDirectMode(t.mode)) {
                            transFee += t.fee;
                        }
                    }
                    roundNumber = modules.round.calc(block.height);
                    _b = self.increaseRoundData({ fees: transFee, rewards: block.reward }, roundNumber), fees = _b.fees, rewards = _b.rewards;
                    if (block.height % 101 !== 0)
                        return [2];
                    app.logger.debug("----------------------on round " + roundNumber + " end-----------------------");
                    return [4, PIFY(modules.delegates.generateDelegateList)(block.height)];
                case 1:
                    delegates = _d.sent();
                    app.logger.debug('delegate length', delegates.length);
                    return [4, app.sdb.getBlocksByHeightRange(block.height - 100, block.height - 1)];
                case 2:
                    forgedBlocks = _d.sent();
                    forgedDelegates = forgedBlocks.map(function (b) { return b.delegate; }).concat([block.delegate]);
                    missedDelegates = delegates.filter(function (fd) { return !forgedDelegates.includes(fd); });
                    missedDelegates.forEach(function (md) {
                        address = addressHelper.generateNormalAddress(md);
                        app.sdb.increase('Delegate', { missedDelegate: 1 }, { address: address });
                    });
                    councilControl = 0;
                    if (!councilControl)
                        return [3, 3];
                    councilAddress = 'GADQ2bozmxjBfYHDQx3uwtpwXmdhafUdkN';
                    app.sdb.createOrLoad('Account', { aec: 0, address: councilAddress, name: null });
                    app.sdb.increase('Account', { aec: fees + rewards }, { address: councilAddress });
                    return [3, 9];
                case 3:
                    ratio = 1;
                    actualFees = Math.floor(fees * ratio);
                    feeAverage = Math.floor(actualFees / delegates.length);
                    feeRemainder = actualFees - (feeAverage * delegates.length);
                    actualRewards = Math.floor(rewards * ratio);
                    rewardAverage = Math.floor(actualRewards / delegates.length);
                    rewardRemainder = actualRewards - (rewardAverage * delegates.length);
                    _c = 0, forgedDelegates_1 = forgedDelegates;
                    _d.label = 4;
                case 4:
                    if (!(_c < forgedDelegates_1.length))
                        return [3, 7];
                    fd = forgedDelegates_1[_c];
                    return [4, updateDelegate(fd, feeAverage, rewardAverage)];
                case 5:
                    _d.sent();
                    _d.label = 6;
                case 6:
                    _c++;
                    return [3, 4];
                case 7: return [4, updateDelegate(block.delegate, feeRemainder, rewardRemainder)];
                case 8:
                    _d.sent();
                    _d.label = 9;
                case 9:
                    if (block.height % 101 === 0) {
                        modules.delegates.updateBookkeeper();
                    }
                    return [2];
            }
        });
    });
};
Blocks.prototype.getBlocks = function (minHeight, maxHeight, withTransaction) {
    return __awaiter(_this, void 0, void 0, function () {
        var blocks, transactions, firstHeight, _i, transactions_1, t, h, b;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, app.sdb.getBlocksByHeightRange(minHeight, maxHeight)];
                case 1:
                    blocks = _a.sent();
                    if (!blocks || !blocks.length) {
                        return [2, []];
                    }
                    maxHeight = blocks[blocks.length - 1].height;
                    if (!withTransaction)
                        return [3, 3];
                    return [4, app.sdb.findAll('Transaction', {
                            condition: {
                                height: { $gte: minHeight, $lte: maxHeight },
                            },
                        })];
                case 2:
                    transactions = _a.sent();
                    firstHeight = blocks[0].height;
                    for (_i = 0, transactions_1 = transactions; _i < transactions_1.length; _i++) {
                        t = transactions_1[_i];
                        h = t.height;
                        b = blocks[h - firstHeight];
                        if (b) {
                            if (!b.transactions) {
                                b.transactions = [];
                            }
                            b.transactions.push(t);
                        }
                    }
                    _a.label = 3;
                case 3: return [2, blocks];
            }
        });
    });
};
Blocks.prototype.loadBlocksFromPeer = function (peer, id, cb) {
    var loaded = false;
    var count = 0;
    var lastValidBlock = null;
    var lastCommonBlockId = id;
    async.whilst(function () { return !loaded && count < 30; }, function (next) {
        count++;
        var limit = 200;
        var params = {
            limit: limit,
            lastBlockId: lastCommonBlockId,
        };
        modules.peer.request('blocks', params, peer, function (err, body) {
            if (err) {
                return next("Failed to request remote peer: " + err);
            }
            if (!body) {
                return next('Invalid response for blocks request');
            }
            var blocks = body.blocks;
            if (!isArray(blocks) || blocks.length === 0) {
                loaded = true;
                return next();
            }
            var num = isArray(blocks) ? blocks.length : 0;
            var address = peer.host + ":" + (peer.port - 1);
            library.logger.info("Loading " + num + " blocks from " + address);
            return (function () {
                return __awaiter(_this, void 0, void 0, function () {
                    var _i, blocks_1, block, e_6;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 5, , 6]);
                                _i = 0, blocks_1 = blocks;
                                _a.label = 1;
                            case 1:
                                if (!(_i < blocks_1.length))
                                    return [3, 4];
                                block = blocks_1[_i];
                                return [4, self.processBlock(block, { syncing: true })];
                            case 2:
                                _a.sent();
                                lastCommonBlockId = block.id;
                                lastValidBlock = block;
                                library.logger.info("Block " + block.id + " loaded from " + address + " at", block.height);
                                _a.label = 3;
                            case 3:
                                _i++;
                                return [3, 1];
                            case 4: return [2, next()];
                            case 5:
                                e_6 = _a.sent();
                                library.logger.error('Failed to process synced block', e_6);
                                return [2, cb(e_6)];
                            case 6: return [2];
                        }
                    });
                });
            })();
        });
    }, function (err) {
        if (err) {
            library.logger.error('load blocks from remote peer error:', err);
        }
        setImmediate(cb, err, lastValidBlock);
    });
};
Blocks.prototype.generateBlock = function (keypair, timestamp) {
    return __awaiter(_this, void 0, void 0, function () {
        var unconfirmedList, payloadHash, payloadLength, fees, _i, unconfirmedList_1, transaction, bytes, height, block, activeKeypairs, e_7, id, localVotes, serverAddr, propose;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (library.base.consensus.hasPendingBlock(timestamp)) {
                        return [2, null];
                    }
                    unconfirmedList = modules.transactions.getUnconfirmedTransactionList();
                    payloadHash = crypto.createHash('sha256');
                    payloadLength = 0;
                    fees = 0;
                    for (_i = 0, unconfirmedList_1 = unconfirmedList; _i < unconfirmedList_1.length; _i++) {
                        transaction = unconfirmedList_1[_i];
                        fees += transaction.fee;
                        bytes = library.base.transaction.getBytes(transaction);
                        if ((payloadLength + bytes.length) > 8 * 1024 * 1024) {
                            throw new Error('Playload length outof range');
                        }
                        payloadHash.update(bytes);
                        payloadLength += bytes.length;
                    }
                    height = priv.lastBlock.height + 1;
                    block = {
                        version: 0,
                        delegate: keypair.publicKey.toString('hex'),
                        height: height,
                        prevBlockId: priv.lastBlock.id,
                        timestamp: timestamp,
                        transactions: unconfirmedList,
                        count: unconfirmedList.length,
                        fees: fees,
                        payloadHash: payloadHash.digest().toString('hex'),
                        reward: priv.blockStatus.calcReward(height),
                    };
                    block.signature = library.base.block.sign(block, keypair);
                    block.id = library.base.block.getId(block);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, PIFY(modules.delegates.getActiveDelegateKeypairs)(block.height)];
                case 2:
                    activeKeypairs = _a.sent();
                    return [3, 4];
                case 3:
                    e_7 = _a.sent();
                    throw new Error("Failed to get active delegate keypairs: " + e_7);
                case 4:
                    id = block.id;
                    assert(activeKeypairs && activeKeypairs.length > 0, 'Active keypairs should not be empty');
                    library.logger.info("get active delegate keypairs len: " + activeKeypairs.length);
                    localVotes = library.base.consensus.createVotes(activeKeypairs, block);
                    if (!library.base.consensus.hasEnoughVotes(localVotes))
                        return [3, 6];
                    modules.transactions.clearUnconfirmed();
                    return [4, self.processBlock(block, { local: true, broadcast: true, votes: localVotes })];
                case 5:
                    _a.sent();
                    library.logger.info("Forged new block id: " + id + ", height: " + height + ", round: " + modules.round.calc(height) + ", slot: " + slots.getSlotNumber(block.timestamp) + ", reward: " + block.reward);
                    return [2, null];
                case 6:
                    if (!library.config.publicIp) {
                        library.logger.error('No public ip');
                        return [2, null];
                    }
                    serverAddr = library.config.publicIp + ":" + library.config.peerPort;
                    try {
                        propose = library.base.consensus.createPropose(keypair, block, serverAddr);
                    }
                    catch (e) {
                        library.logger.error('Failed to create propose', e);
                        return [2, null];
                    }
                    library.base.consensus.setPendingBlock(block);
                    library.base.consensus.addPendingVotes(localVotes);
                    priv.proposeCache[propose.hash] = true;
                    priv.isCollectingVotes = true;
                    library.bus.message('newPropose', propose, true);
                    return [2, null];
            }
        });
    });
};
Blocks.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Blocks.prototype.onReceiveBlock = function (block, votes) {
    if (modules.loader.syncing() || !priv.loaded) {
        return;
    }
    if (priv.blockCache[block.id]) {
        return;
    }
    priv.blockCache[block.id] = true;
    library.sequence.add(function (cb) {
        if (block.prevBlockId === priv.lastBlock.id && priv.lastBlock.height + 1 === block.height) {
            library.logger.info("Received new block id: " + block.id +
                (" height: " + block.height) +
                (" round: " + modules.round.calc(modules.blocks.getLastBlock().height)) +
                (" slot: " + slots.getSlotNumber(block.timestamp)));
            return (function () {
                return __awaiter(_this, void 0, void 0, function () {
                    var pendingTrsMap, pendingTrs, _i, pendingTrs_1, t, e_8, _a, _b, t, redoTransactions, e_9;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                pendingTrsMap = new Map();
                                _c.label = 1;
                            case 1:
                                _c.trys.push([1, 4, 5, 10]);
                                pendingTrs = modules.transactions.getUnconfirmedTransactionList();
                                for (_i = 0, pendingTrs_1 = pendingTrs; _i < pendingTrs_1.length; _i++) {
                                    t = pendingTrs_1[_i];
                                    pendingTrsMap.set(t.id, t);
                                }
                                modules.transactions.clearUnconfirmed();
                                return [4, app.sdb.rollbackBlock()];
                            case 2:
                                _c.sent();
                                return [4, self.processBlock(block, { votes: votes, broadcast: true })];
                            case 3:
                                _c.sent();
                                return [3, 10];
                            case 4:
                                e_8 = _c.sent();
                                library.logger.error('Failed to process received block', e_8);
                                return [3, 10];
                            case 5:
                                for (_a = 0, _b = block.transactions; _a < _b.length; _a++) {
                                    t = _b[_a];
                                    pendingTrsMap.delete(t.id);
                                }
                                _c.label = 6;
                            case 6:
                                _c.trys.push([6, 8, , 9]);
                                redoTransactions = pendingTrsMap.values().slice();
                                return [4, modules.transactions.processUnconfirmedTransactionsAsync(redoTransactions)];
                            case 7:
                                _c.sent();
                                return [3, 9];
                            case 8:
                                e_9 = _c.sent();
                                library.logger.error('Failed to redo unconfirmed transactions', e_9);
                                return [3, 9];
                            case 9:
                                cb();
                                return [7];
                            case 10: return [2];
                        }
                    });
                });
            })();
        }
        if (block.prevBlockId !== priv.lastBlock.id
            && priv.lastBlock.height + 1 === block.height) {
            modules.delegates.fork(block, 1);
            return cb('Fork');
        }
        if (block.prevBlockId === priv.lastBlock.prevBlockId
            && block.height === priv.lastBlock.height
            && block.id !== priv.lastBlock.id) {
            modules.delegates.fork(block, 5);
            return cb('Fork');
        }
        if (block.height > priv.lastBlock.height + 1) {
            library.logger.info("receive discontinuous block height " + block.height);
            modules.loader.startSyncBlocks();
            return cb();
        }
        return cb();
    });
};
Blocks.prototype.onReceivePropose = function (propose) {
    if (modules.loader.syncing() || !priv.loaded) {
        return;
    }
    if (priv.proposeCache[propose.hash]) {
        return;
    }
    priv.proposeCache[propose.hash] = true;
    library.sequence.add(function (cb) {
        if (priv.lastPropose && priv.lastPropose.height === propose.height
            && priv.lastPropose.generatorPublicKey === propose.generatorPublicKey
            && priv.lastPropose.id !== propose.id) {
            library.logger.warn("generate different block with the same height, generator: " + propose.generatorPublicKey);
            return setImmediate(cb);
        }
        if (propose.height !== priv.lastBlock.height + 1) {
            library.logger.debug('invalid propose height', propose);
            if (propose.height > priv.lastBlock.height + 1) {
                library.logger.info("receive discontinuous propose height " + propose.height);
                modules.loader.startSyncBlocks();
            }
            return setImmediate(cb);
        }
        if (priv.lastVoteTime && Date.now() - priv.lastVoteTime < 5 * 1000) {
            library.logger.debug('ignore the frequently propose');
            return setImmediate(cb);
        }
        library.logger.info("receive propose height " + propose.height + " bid " + propose.id);
        return async.waterfall([
            function (next) {
                modules.delegates.validateProposeSlot(propose, function (err) {
                    if (err) {
                        next("Failed to validate propose slot: " + err);
                    }
                    else {
                        next();
                    }
                });
            },
            function (next) {
                library.base.consensus.acceptPropose(propose, function (err) {
                    if (err) {
                        next("Failed to accept propose: " + err);
                    }
                    else {
                        next();
                    }
                });
            },
            function (next) {
                modules.delegates.getActiveDelegateKeypairs(propose.height, function (err, activeKeypairs) {
                    if (err) {
                        next("Failed to get active keypairs: " + err);
                    }
                    else {
                        next(null, activeKeypairs);
                    }
                });
            },
            function (activeKeypairs, next) {
                if (activeKeypairs && activeKeypairs.length > 0) {
                    var votes = library.base.consensus.createVotes(activeKeypairs, propose);
                    library.logger.debug("send votes height " + votes.height + " id " + votes.id + " sigatures " + votes.signatures.length);
                    modules.transport.sendVotes(votes, propose.address);
                    priv.lastVoteTime = Date.now();
                    priv.lastPropose = propose;
                }
                setImmediate(next);
            },
        ], function (err) {
            if (err) {
                library.logger.error("onReceivePropose error: " + err);
            }
            library.logger.debug('onReceivePropose finished');
            cb();
        });
    });
};
Blocks.prototype.onReceiveVotes = function (votes) {
    if (modules.loader.syncing() || !priv.loaded) {
        return;
    }
    library.sequence.add(function (cb) {
        var totalVotes = library.base.consensus.addPendingVotes(votes);
        if (totalVotes && totalVotes.signatures) {
            library.logger.debug("receive new votes, total votes number " + totalVotes.signatures.length);
        }
        if (library.base.consensus.hasEnoughVotes(totalVotes)) {
            var block_1 = library.base.consensus.getPendingBlock();
            var height_1 = block_1.height;
            var id_1 = block_1.id;
            return (function () {
                return __awaiter(_this, void 0, void 0, function () {
                    var err_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                modules.transactions.clearUnconfirmed();
                                return [4, self.processBlock(block_1, { votes: totalVotes, local: true, broadcast: true })];
                            case 1:
                                _a.sent();
                                library.logger.info("Forged new block id: " + id_1 + ", height: " + height_1 + ", round: " + modules.round.calc(height_1) + ", slot: " + slots.getSlotNumber(block_1.timestamp) + ", reward: " + block_1.reward);
                                return [3, 3];
                            case 2:
                                err_1 = _a.sent();
                                library.logger.error("Failed to process confirmed block height: " + height_1 + " id: " + id_1 + " error: " + err_1);
                                return [3, 3];
                            case 3:
                                cb();
                                return [2];
                        }
                    });
                });
            })();
        }
        return setImmediate(cb);
    });
};
Blocks.prototype.getSupply = function () {
    var height = priv.lastBlock.height;
    return priv.blockStatus.calcSupply(height);
};
Blocks.prototype.getCirculatingSupply = function () {
    var height = priv.lastBlock.height;
    return priv.blockStatus.calcSupply(height);
};
Blocks.prototype.isCollectingVotes = function () { return priv.isCollectingVotes; };
Blocks.prototype.isHealthy = function () {
    var lastBlock = priv.lastBlock;
    var lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    return slots.getNextSlot() - lastSlot < 3 && !modules.loader.syncing();
};
Blocks.prototype.onBind = function (scope) {
    modules = scope;
    priv.loaded = true;
    return (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var count, block, e_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        count = app.sdb.blocksCount;
                        app.logger.info('Blocks found:', count);
                        if (!!count)
                            return [3, 2];
                        self.setLastBlock({ height: -1 });
                        return [4, self.processBlock(genesisblock.block, {})];
                    case 1:
                        _a.sent();
                        return [3, 4];
                    case 2: return [4, app.sdb.getBlockByHeight(count - 1)];
                    case 3:
                        block = _a.sent();
                        self.setLastBlock(block);
                        _a.label = 4;
                    case 4:
                        library.bus.message('blockchainReady');
                        return [3, 6];
                    case 5:
                        e_10 = _a.sent();
                        app.logger.error('Failed to prepare local blockchain', e_10);
                        process.exit(0);
                        return [3, 6];
                    case 6: return [2];
                }
            });
        });
    })();
};
Blocks.prototype.cleanup = function (cb) {
    priv.loaded = false;
    cb();
};
shared.getBlock = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var query = req.body;
    return library.scheme.validate(query, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
            },
            height: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var block, e_11;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            block = void 0;
                            if (!query.id)
                                return [3, 2];
                            return [4, app.sdb.getBlockById(query.id)];
                        case 1:
                            block = _a.sent();
                            return [3, 4];
                        case 2:
                            if (!(query.height !== undefined))
                                return [3, 4];
                            return [4, app.sdb.getBlockByHeight(query.height)];
                        case 3:
                            block = _a.sent();
                            _a.label = 4;
                        case 4:
                            if (!block) {
                                return [2, cb('Block not found')];
                            }
                            return [2, cb(null, { block: self.toAPIV1Block(block) })];
                        case 5:
                            e_11 = _a.sent();
                            library.logger.error(e_11);
                            return [2, cb('Server error')];
                        case 6: return [2];
                    }
                });
            });
        })();
    });
};
shared.getFullBlock = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var query = req.body;
    return library.scheme.validate(query, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
            },
            height: {
                type: 'integer',
                minimum: 0,
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var block_2, callback, e_12;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            block_2 = undefined;
                            if (!query.id)
                                return [3, 2];
                            return [4, app.sdb.getBlockById(query.id)];
                        case 1:
                            block_2 = _a.sent();
                            return [3, 4];
                        case 2:
                            if (!(query.height !== undefined))
                                return [3, 4];
                            return [4, app.sdb.getBlockByHeight(query.height)];
                        case 3:
                            block_2 = _a.sent();
                            _a.label = 4;
                        case 4:
                            if (!block_2)
                                return [2, cb('Block not found')];
                            callback = function (err, ret) {
                                if (err)
                                    return cb(err);
                                block_2 = self.toAPIV1Block(block_2);
                                block_2.transactions = ret.transactions;
                                block_2.numberOfTransactions = isArray(block_2.transactions) ? block_2.transactions.length : 0;
                                return cb(null, { block: block_2 });
                            };
                            req.body.blockId = block_2.id;
                            req.body.unlimited = true;
                            delete req.body.id;
                            return [2, modules.transactions.getTransactionsForV1(req, callback)];
                        case 5:
                            e_12 = _a.sent();
                            library.logger.error('Failed to find block', e_12);
                            return [2, cb('Server error')];
                        case 6: return [2];
                    }
                });
            });
        })();
    });
};
shared.getBlocks = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var query = req.body;
    return library.scheme.validate(query, {
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
            generatorPublicKey: {
                type: 'string',
                format: 'publicKey',
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var offset, limit, minHeight, maxHeight, count, blocks, e_13;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            offset = query.offset ? Number(query.offset) : 0;
                            limit = query.limit ? Number(query.limit) : 20;
                            minHeight = void 0;
                            maxHeight = void 0;
                            if (query.orderBy === 'height:desc') {
                                maxHeight = priv.lastBlock.height - offset;
                                minHeight = (maxHeight - limit) + 1;
                            }
                            else {
                                minHeight = offset;
                                maxHeight = (offset + limit) - 1;
                            }
                            count = app.sdb.blocksCount;
                            if (!count)
                                throw new Error('Failed to get blocks count');
                            return [4, app.sdb.getBlocksByHeightRange(minHeight, maxHeight)];
                        case 1:
                            blocks = _a.sent();
                            if (!blocks || !blocks.length)
                                return [2, cb('No blocks')];
                            return [2, cb(null, { count: count, blocks: self.toAPIV1Blocks(blocks) })];
                        case 2:
                            e_13 = _a.sent();
                            library.logger.error('Failed to find blocks', e_13);
                            return [2, cb('Server error')];
                        case 3: return [2];
                    }
                });
            });
        })();
    });
};
shared.getHeight = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    return cb(null, { height: priv.lastBlock.height });
};
shared.getMilestone = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var height = priv.lastBlock.height;
    return cb(null, { milestone: priv.blockStatus.calcMilestone(height) });
};
shared.getReward = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var height = priv.lastBlock.height;
    return cb(null, { reward: priv.blockStatus.calcReward(height) });
};
shared.getSupply = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var height = priv.lastBlock.height;
    return cb(null, { supply: priv.blockStatus.calcSupply(height) });
};
shared.getStatus = function (req, cb) {
    if (!priv.loaded) {
        return cb('Blockchain is loading');
    }
    var height = priv.lastBlock.height;
    return cb(null, {
        height: height,
        fee: library.base.block.calculateFee(),
        milestone: priv.blockStatus.calcMilestone(height),
        reward: priv.blockStatus.calcReward(height),
        supply: priv.blockStatus.calcSupply(height),
    });
};
module.exports = Blocks;
