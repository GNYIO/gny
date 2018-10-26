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
var _ = require('lodash');
var LRU = require('lru-cache');
var Router = require('../utils/router.js');
var slots = require('../utils/slots.js');
var sandboxHelper = require('../utils/sandbox.js');
var modules;
var library;
var self;
var priv = {};
var shared = {};
priv.headers = {};
priv.loaded = false;
function Transport(cb, scope) {
    library = scope;
    self = this;
    priv.attachApi();
    priv.latestBlocksCache = new LRU(200);
    priv.blockHeaderMidCache = new LRU(1000);
    setImmediate(cb, null, self);
}
priv.attachApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules.loader.syncing()) {
            return res.status(500).send({
                success: false,
                error: 'Blockchain is syncing',
            });
        }
        res.set(priv.headers);
        if (req.headers.magic !== library.config.magic) {
            return res.status(500).send({
                success: false,
                error: 'Request is made on the wrong network',
                expected: library.config.magic,
                received: req.headers.magic,
            });
        }
        return next();
    });
    router.post('/newBlock', function (req, res) {
        var body = req.body;
        if (!body.id) {
            return res.status(500).send({ error: 'Invalid params' });
        }
        var newBlock = priv.latestBlocksCache.get(body.id);
        if (!newBlock) {
            return res.status(500).send({ error: 'New block not found' });
        }
        return res.send({ success: true, block: newBlock.block, votes: newBlock.votes });
    });
    router.post('/commonBlock', function (req, res) {
        var body = req.body;
        if (!Number.isInteger(body.max))
            return res.send({ error: 'Field max must be integer' });
        if (!Number.isInteger(body.min))
            return res.send({ error: 'Field min must be integer' });
        var max = body.max;
        var min = body.min;
        var ids = body.ids;
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var blocks, commonBlock, i, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4, app.sdb.getBlocksByHeightRange(min, max)];
                        case 1:
                            blocks = _a.sent();
                            if (!blocks || !blocks.length) {
                                return [2, res.status(500).send({ success: false, error: 'Blocks not found' })];
                            }
                            blocks = blocks.reverse();
                            commonBlock = null;
                            for (i in ids) {
                                if (blocks[i].id === ids[i]) {
                                    commonBlock = blocks[i];
                                    break;
                                }
                            }
                            if (!commonBlock) {
                                return [2, res.status(500).send({ success: false, error: 'Common block not found' })];
                            }
                            return [2, res.send({ success: true, common: commonBlock })];
                        case 2:
                            e_1 = _a.sent();
                            app.logger.error("Failed to find common block: " + e_1);
                            return [2, res.send({ success: false, error: 'Failed to find common block' })];
                        case 3: return [2];
                    }
                });
            });
        })();
    });
    router.post('/blocks', function (req, res) {
        var body = req.body;
        var blocksLimit = 200;
        if (body.limit) {
            blocksLimit = Math.min(blocksLimit, Number(body.limit));
        }
        var lastBlockId = body.lastBlockId;
        if (!lastBlockId) {
            return res.status(500).send({ error: 'Invalid params' });
        }
        return (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var lastBlock, minHeight, maxHeight, blocks, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4, app.sdb.getBlockById(lastBlockId)];
                        case 1:
                            lastBlock = _a.sent();
                            if (!lastBlock)
                                throw new Error("Last block not found: " + lastBlockId);
                            minHeight = lastBlock.height + 1;
                            maxHeight = (minHeight + blocksLimit) - 1;
                            return [4, modules.blocks.getBlocks(minHeight, maxHeight, true)];
                        case 2:
                            blocks = _a.sent();
                            return [2, res.send({ blocks: blocks })];
                        case 3:
                            e_2 = _a.sent();
                            app.logger.error('Failed to get blocks or transactions', e_2);
                            return [2, res.send({ blocks: [] })];
                        case 4: return [2];
                    }
                });
            });
        })();
    });
    router.post('/transactions', function (req, res) {
        var lastBlock = modules.blocks.getLastBlock();
        var lastSlot = slots.getSlotNumber(lastBlock.timestamp);
        if (slots.getNextSlot() - lastSlot >= 12) {
            library.logger.error('Blockchain is not ready', {
                getNextSlot: slots.getNextSlot(),
                lastSlot: lastSlot,
                lastBlockHeight: lastBlock.height,
            });
            return res.status(200).json({ success: false, error: 'Blockchain is not ready' });
        }
        var transaction;
        try {
            transaction = library.base.transaction.objectNormalize(req.body.transaction);
        }
        catch (e) {
            library.logger.error('Received transaction parse error', {
                raw: req.body,
                trs: transaction,
                error: e.toString(),
            });
            return res.status(200).json({ success: false, error: 'Invalid transaction body' });
        }
        return library.sequence.add(function (cb) {
            library.logger.info("Received transaction " + transaction.id + " from http client");
            modules.transactions.processUnconfirmedTransaction(transaction, cb);
        }, function (err) {
            if (err) {
                library.logger.warn("Receive invalid transaction " + transaction.id, err);
                var errMsg = err.message ? err.message : err.toString();
                res.status(200).json({ success: false, error: errMsg });
            }
            else {
                library.bus.message('unconfirmedTransaction', transaction);
                res.status(200).json({ success: true, transactionId: transaction.id });
            }
        });
    });
    router.post('/votes', function (req, res) {
        library.bus.message('receiveVotes', req.body.votes);
        res.send({});
    });
    router.post('/getUnconfirmedTransactions', function (req, res) {
        res.send({ transactions: modules.transactions.getUnconfirmedTransactionList() });
    });
    router.post('/getHeight', function (req, res) {
        res.send({
            height: modules.blocks.getLastBlock().height,
        });
    });
    router.post('/chainRequest', function (req, res) {
        var params = req.body;
        var body = req.body.body;
        try {
            if (!params.chain) {
                return res.send({ success: false, error: 'missed chain' });
            }
        }
        catch (e) {
            library.logger.error('receive invalid chain request', { error: e.toString(), params: params });
            return res.send({ success: false, error: e.toString() });
        }
        return modules.chains.request(params.chain, body.method, body.path, { query: body.query }, function (err, ret) {
            if (!err && ret.error) {
                err = ret.error;
            }
            if (err) {
                library.logger.error('failed to process chain request', err);
                return res.send({ success: false, error: err });
            }
            return res.send(_.assign({ success: true }, ret));
        });
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/peer', router);
};
Transport.prototype.broadcast = function (topic, message, recursive) {
    modules.peer.publish(topic, message, recursive);
};
Transport.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Transport.prototype.onBind = function (scope) {
    modules = scope;
    priv.headers = {
        os: modules.system.getOS(),
        version: modules.system.getVersion(),
        port: modules.system.getPort(),
        magic: modules.system.getMagic(),
    };
};
Transport.prototype.onBlockchainReady = function () {
    priv.loaded = true;
};
Transport.prototype.onPeerReady = function () {
    modules.peer.subscribe('newBlockHeader', function (message, peer) {
        if (modules.loader.syncing()) {
            return;
        }
        var lastBlock = modules.blocks.getLastBlock();
        if (!lastBlock) {
            library.logger.error('Last block not exists');
            return;
        }
        var body = message.body;
        if (!body || !body.id || !body.height || !body.prevBlockId) {
            library.logger.error('Invalid message body');
            return;
        }
        var height = body.height;
        var id = body.id.toString('hex');
        var prevBlockId = body.prevBlockId.toString('hex');
        if (height !== lastBlock.height + 1 || prevBlockId !== lastBlock.id) {
            library.logger.warn('New block donnot match with last block', message);
            if (height > lastBlock.height + 5) {
                library.logger.warn('Receive new block header from long fork');
            }
            else {
                modules.loader.syncBlocksFromPeer(peer);
            }
            return;
        }
        library.logger.info('Receive new block header', { height: height, id: id });
        modules.peer.request('newBlock', { id: id }, peer, function (err, result) {
            if (err) {
                library.logger.error('Failed to get latest block data', err);
                return;
            }
            if (!result || !result.block || !result.votes) {
                library.logger.error('Invalid block data', result);
                return;
            }
            try {
                var block = result.block;
                var votes = library.protobuf.decodeBlockVotes(Buffer.from(result.votes, 'base64'));
                block = library.base.block.objectNormalize(block);
                votes = library.base.consensus.normalizeVotes(votes);
                priv.latestBlocksCache.set(block.id, result);
                priv.blockHeaderMidCache.set(block.id, message);
                library.bus.message('receiveBlock', block, votes);
            }
            catch (e) {
                library.logger.error("normalize block or votes object error: " + e.toString(), result);
            }
        });
    });
    modules.peer.subscribe('propose', function (message) {
        try {
            var propose = library.protobuf.decodeBlockPropose(message.body.propose);
            library.bus.message('receivePropose', propose);
        }
        catch (e) {
            library.logger.error('Receive invalid propose', e);
        }
    });
    modules.peer.subscribe('transaction', function (message) {
        if (modules.loader.syncing()) {
            return;
        }
        var lastBlock = modules.blocks.getLastBlock();
        var lastSlot = slots.getSlotNumber(lastBlock.timestamp);
        if (slots.getNextSlot() - lastSlot >= 12) {
            library.logger.error('Blockchain is not ready', { getNextSlot: slots.getNextSlot(), lastSlot: lastSlot, lastBlockHeight: lastBlock.height });
            return;
        }
        var transaction;
        try {
            transaction = message.body.transaction;
            if (Buffer.isBuffer(transaction))
                transaction = transaction.toString();
            transaction = JSON.parse(transaction);
            transaction = library.base.transaction.objectNormalize(transaction);
        }
        catch (e) {
            library.logger.error('Received transaction parse error', {
                message: message,
                error: e.toString(),
            });
            return;
        }
        library.sequence.add(function (cb) {
            library.logger.info("Received transaction " + transaction.id + " from remote peer");
            modules.transactions.processUnconfirmedTransaction(transaction, cb);
        }, function (err) {
            if (err) {
                library.logger.warn("Receive invalid transaction " + transaction.id, err);
            }
            else {
            }
        });
    });
};
Transport.prototype.onUnconfirmedTransaction = function (transaction) {
    var message = {
        body: {
            transaction: JSON.stringify(transaction),
        },
    };
    self.broadcast('transaction', message);
};
Transport.prototype.onNewBlock = function (block, votes) {
    priv.latestBlocksCache.set(block.id, {
        block: block,
        votes: library.protobuf.encodeBlockVotes(votes).toString('base64'),
    });
    var message = priv.blockHeaderMidCache.get(block.id) || {
        body: {
            id: Buffer.from(block.id, 'hex'),
            height: block.height,
            prevBlockId: Buffer.from(block.prevBlockId, 'hex'),
        },
    };
    self.broadcast('newBlockHeader', message, 0);
};
Transport.prototype.onNewPropose = function (propose) {
    var message = {
        body: {
            propose: library.protobuf.encodeBlockPropose(propose),
        },
    };
    self.broadcast('propose', message);
};
Transport.prototype.sendVotes = function (votes, address) {
    var parts = address.split(':');
    var contact = {
        host: parts[0],
        port: parts[1],
    };
    modules.peer.request('votes', { votes: votes }, contact, function (err) {
        if (err) {
            library.logger.error('send votes error', err);
        }
    });
};
Transport.prototype.cleanup = function (cb) {
    priv.loaded = false;
    cb();
};
shared.message = function (msg, cb) {
    msg.timestamp = (new Date()).getTime();
    cb(null, {});
};
shared.request = function (req, cb) {
    if (req.body.peer) {
        modules.peer.request('chainRequest', req, req.body.peer, function (err, res) {
            if (res) {
                res.peer = req.body.peer;
            }
            cb(err, res);
        });
    }
    else {
        modules.peer.randomRequest('chainRequest', req, cb);
    }
};
module.exports = Transport;
