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
var ed = require('../utils/ed.js');
var Router = require('../utils/router.js');
var sandboxHelper = require('../utils/sandbox.js');
var LimitCache = require('../utils/limit-cache.js');
var addressHelper = require('../utils/address.js');
var transactionMode = require('../utils/transaction-mode.js');
var modules;
var library;
var self;
var genesisblock;
var priv = {};
var shared = {};
priv.unconfirmedNumber = 0;
priv.unconfirmedTransactions = [];
priv.unconfirmedTransactionsIdIndex = {};
var TransactionPool = (function () {
    function TransactionPool() {
        this.index = new Map();
        this.unConfirmed = [];
    }
    TransactionPool.prototype.add = function (trs) {
        this.unConfirmed.push(trs);
        this.index.set(trs.id, this.unConfirmed.length - 1);
    };
    TransactionPool.prototype.remove = function (id) {
        var pos = this.index.get(id);
        delete this.index[id];
        this.unConfirmed[pos] = null;
    };
    TransactionPool.prototype.has = function (id) {
        var pos = this.index.get(id);
        return pos !== undefined && !!this.unConfirmed[pos];
    };
    TransactionPool.prototype.getUnconfirmed = function () {
        var a = [];
        for (var i = 0; i < this.unConfirmed.length; i++) {
            if (this.unConfirmed[i]) {
                a.push(this.unConfirmed[i]);
            }
        }
        return a;
    };
    TransactionPool.prototype.clear = function () {
        this.index = new Map();
        this.unConfirmed = [];
    };
    TransactionPool.prototype.get = function (id) {
        var pos = this.index.get(id);
        return this.unConfirmed[pos];
    };
    return TransactionPool;
}());
function Transactions(cb, scope) {
    library = scope;
    genesisblock = library.genesisblock;
    self = this;
    self.pool = new TransactionPool();
    self.failedTrsCache = new LimitCache();
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
        'get /': 'getTransactions',
        'get /get': 'getTransaction',
        'get /unconfirmed/get': 'getUnconfirmedTransaction',
        'get /unconfirmed': 'getUnconfirmedTransactions',
        'put /': 'addTransactionUnsigned',
        'put /batch': 'addTransactions',
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/transactions', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
    priv.attachStorageApi();
};
priv.attachStorageApi = function () {
    var router = new Router();
    router.use(function (req, res, next) {
        if (modules)
            return next();
        return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    });
    router.map(shared, {
        'get /get': 'getStorage',
        'get /:id': 'getStorage',
        'put /': 'putStorage',
    });
    router.use(function (req, res) {
        res.status(500).send({ success: false, error: 'API endpoint not found' });
    });
    library.network.app.use('/api/storages', router);
    library.network.app.use(function (err, req, res, next) {
        if (!err)
            return next();
        library.logger.error(req.url, err.toString());
        return res.status(500).send({ success: false, error: err.toString() });
    });
};
Transactions.prototype.getUnconfirmedTransaction = function (id) { return self.pool.get(id); };
Transactions.prototype.getUnconfirmedTransactionList = function () { return self.pool.getUnconfirmed(); };
Transactions.prototype.removeUnconfirmedTransaction = function (id) { return self.pool.remove(id); };
Transactions.prototype.hasUnconfirmed = function (id) { return self.pool.has(id); };
Transactions.prototype.clearUnconfirmed = function () { return self.pool.clear(); };
Transactions.prototype.getUnconfirmedTransactions = function (_, cb) { return setImmediate(cb, null, { transactions: self.getUnconfirmedTransactionList() }); };
Transactions.prototype.getTransactions = function (req, cb) {
    var query = req.body;
    var limit = query.limit ? Number(query.limit) : 100;
    var offset = query.offset ? Number(query.offset) : 0;
    var condition = {};
    if (query.senderId) {
        condition.senderId = query.senderId;
    }
    if (query.type) {
        condition.type = Number(query.type);
    }
    (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var count, transactions, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4, app.sdb.count('Transaction', condition)];
                    case 1:
                        count = _a.sent();
                        return [4, app.sdb.find('Transaction', condition, { limit: limit, offset: offset })];
                    case 2:
                        transactions = _a.sent();
                        if (!transactions)
                            transactions = [];
                        return [2, cb(null, { transactions: transactions, count: count })];
                    case 3:
                        e_1 = _a.sent();
                        app.logger.error('Failed to get transactions', e_1);
                        return [2, cb("System error: " + e_1)];
                    case 4: return [2];
                }
            });
        });
    })();
};
Transactions.prototype.getTransaction = function (req, cb) {
    (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var id, trs, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!req.params || !req.params.id)
                            return [2, cb('Invalid transaction id')];
                        id = req.params.id;
                        return [4, app.sdb.find('Transaction', { id: id })];
                    case 1:
                        trs = _a.sent();
                        if (!trs || !trs.length)
                            return [2, cb('Transaction not found')];
                        return [2, cb(null, { transaction: trs[0] })];
                    case 2:
                        e_2 = _a.sent();
                        return [2, cb("System error: " + e_2)];
                    case 3: return [2];
                }
            });
        });
    })();
};
Transactions.prototype.applyTransactionsAsync = function (transactions) {
    return __awaiter(_this, void 0, void 0, function () {
        var i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < transactions.length))
                        return [3, 4];
                    return [4, self.applyUnconfirmedTransactionAsync(transactions[i])];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    ++i;
                    return [3, 1];
                case 4: return [2];
            }
        });
    });
};
Transactions.prototype.processUnconfirmedTransactions = function (transactions, cb) {
    (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var _i, transactions_1, transaction, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        _i = 0, transactions_1 = transactions;
                        _a.label = 1;
                    case 1:
                        if (!(_i < transactions_1.length))
                            return [3, 4];
                        transaction = transactions_1[_i];
                        return [4, self.processUnconfirmedTransactionAsync(transaction)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3, 1];
                    case 4:
                        cb(null, transactions);
                        return [3, 6];
                    case 5:
                        e_3 = _a.sent();
                        cb(e_3.toString(), transactions);
                        return [3, 6];
                    case 6: return [2];
                }
            });
        });
    })();
};
Transactions.prototype.processUnconfirmedTransactionsAsync = function (transactions) {
    return __awaiter(_this, void 0, void 0, function () {
        var _i, transactions_2, transaction;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, transactions_2 = transactions;
                    _a.label = 1;
                case 1:
                    if (!(_i < transactions_2.length))
                        return [3, 4];
                    transaction = transactions_2[_i];
                    return [4, self.processUnconfirmedTransactionAsync(transaction)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3, 1];
                case 4: return [2];
            }
        });
    });
};
Transactions.prototype.processUnconfirmedTransaction = function (transaction, cb) {
    (function () {
        return __awaiter(_this, void 0, void 0, function () {
            var e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4, self.processUnconfirmedTransactionAsync(transaction)];
                    case 1:
                        _a.sent();
                        cb(null, transaction);
                        return [3, 3];
                    case 2:
                        e_4 = _a.sent();
                        cb(e_4.toString(), transaction);
                        return [3, 3];
                    case 3: return [2];
                }
            });
        });
    })();
};
Transactions.prototype.processUnconfirmedTransactionAsync = function (transaction) {
    return __awaiter(_this, void 0, void 0, function () {
        var id, exists, e_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!transaction.id) {
                        transaction.id = library.base.transaction.getId(transaction);
                    }
                    else {
                        id = library.base.transaction.getId(transaction);
                        if (transaction.id !== id) {
                            throw new Error('Invalid transaction id');
                        }
                    }
                    if (modules.blocks.isCollectingVotes()) {
                        throw new Error('Block consensus in processing');
                    }
                    if (self.failedTrsCache.has(transaction.id)) {
                        throw new Error('Transaction already processed');
                    }
                    if (self.pool.has(transaction.id)) {
                        throw new Error('Transaction already in the pool');
                    }
                    return [4, app.sdb.exists('Transaction', { id: transaction.id })];
                case 1:
                    exists = _a.sent();
                    if (exists) {
                        throw new Error('Transaction already confirmed');
                    }
                    return [4, self.applyUnconfirmedTransactionAsync(transaction)];
                case 2:
                    _a.sent();
                    self.pool.add(transaction);
                    return [2, transaction];
                case 3:
                    e_5 = _a.sent();
                    self.failedTrsCache.set(transaction.id, true);
                    throw e_5;
                case 4: return [2];
            }
        });
    });
};
Transactions.prototype.applyUnconfirmedTransactionAsync = function (transaction) {
    return __awaiter(_this, void 0, void 0, function () {
        var height, block, senderId, requestorId, mode, requestor, sender, signerId, context, error, e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    library.logger.debug('apply unconfirmed trs', transaction);
                    height = modules.blocks.getLastBlock().height;
                    block = {
                        height: height + 1,
                    };
                    senderId = transaction.senderId;
                    requestorId = transaction.requestorId;
                    if (!senderId) {
                        throw new Error('Missing sender address');
                    }
                    mode = transaction.mode;
                    if (transactionMode.isRequestMode(mode)) {
                        if (!requestorId)
                            throw new Error('No requestor provided');
                        if (requestorId === senderId)
                            throw new Error('Sender should not be equal to requestor');
                        if (!transaction.senderPublicKey)
                            throw new Error('Requestor public key not provided');
                    }
                    else if (transactionMode.isDirectMode(mode)) {
                        if (requestorId)
                            throw new Error('RequestId should not be provided');
                        if (app.util.address.isNormalAddress(senderId)
                            && !transaction.senderPublicKey) {
                            throw new Error('Sender public key not provided');
                        }
                    }
                    else {
                        throw new Error('Unexpected transaction mode');
                    }
                    requestor = null;
                    return [4, app.sdb.load('Account', senderId)];
                case 1:
                    sender = _a.sent();
                    if (!sender) {
                        if (height > 0)
                            throw new Error('Sender account not found');
                        sender = app.sdb.create('Account', {
                            address: senderId,
                            name: null,
                            aec: 0,
                        });
                    }
                    if (!requestorId)
                        return [3, 3];
                    if (!app.util.address.isNormalAddress(requestorId)) {
                        throw new Error('Invalid requestor address');
                    }
                    return [4, app.sdb.load('Account', requestorId)];
                case 2:
                    requestor = _a.sent();
                    if (!requestor) {
                        throw new Error('Requestor account not found');
                    }
                    return [3, 4];
                case 3:
                    requestor = sender;
                    _a.label = 4;
                case 4:
                    if (transaction.senderPublicKey) {
                        signerId = transaction.requestorId || transaction.senderId;
                        if (addressHelper.generateNormalAddress(transaction.senderPublicKey) !== signerId) {
                            throw new Error('Invalid senderPublicKey');
                        }
                    }
                    context = {
                        trs: transaction,
                        block: block,
                        sender: sender,
                        requestor: requestor,
                    };
                    if (!(height > 0))
                        return [3, 6];
                    return [4, library.base.transaction.verify(context)];
                case 5:
                    error = _a.sent();
                    if (error)
                        throw new Error(error);
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    app.sdb.beginContract();
                    return [4, library.base.transaction.apply(context)];
                case 7:
                    _a.sent();
                    app.sdb.commitContract();
                    return [3, 9];
                case 8:
                    e_6 = _a.sent();
                    app.sdb.rollbackContract();
                    library.logger.error(e_6);
                    throw e_6;
                case 9: return [2];
            }
        });
    });
};
Transactions.prototype.toAPIV1Transactions = function (transArray, block) {
    if (transArray && isArray(transArray) && transArray.length > 0) {
        return transArray.map(function (t) { return self.toAPIV1Transaction(t, block); });
    }
    return [];
};
Transactions.prototype.tranfersToAPIV1Transactions = function (transferArray, block) {
    return __awaiter(_this, void 0, void 0, function () {
        var transMap_1, transIds, transArray;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(transferArray && isArray(transferArray) && transferArray.length > 0))
                        return [3, 2];
                    transMap_1 = new Map();
                    transIds = transferArray.map(function (t) { return t.tid; });
                    return [4, app.sdb.find('Transaction', { id: { $in: transIds } })];
                case 1:
                    transArray = _a.sent();
                    transArray.forEach(function (t) { return transMap_1.set(t.id, t); });
                    transferArray.forEach(function (transfer) {
                        var trans = transMap_1.get(transfer.tid);
                        if (trans !== undefined) {
                            transfer.senderPublicKey = trans.senderPublicKey;
                            transfer.signSignature = trans.secondSignature || trans.signSignature;
                            transfer.message = trans.message;
                            transfer.fee = trans.fee;
                            transfer.type = trans.type;
                            transfer.args = trans.args;
                            transfer.signatures = trans.signatures;
                        }
                    });
                    return [2, transferArray.map(function (t) { return self.toAPIV1Transaction(t, block); })];
                case 2: return [2, []];
            }
        });
    });
};
function toV1TypeAndArgs(type, args) {
    var v1Type;
    var v1Args = {};
    var result = {};
    switch (type) {
        case 1:
            v1Type = 0;
            result = { amount: Number(args[0]), recipientId: args[1] };
            break;
        case 3:
            v1Type = 1;
            result = { senderPublicKey: args[0] };
            break;
        case 10:
            v1Type = 2;
            break;
        case 11:
            v1Type = 3;
            reulst = { votes: args.map(function (v) { return "+" + v; }).join(',') };
            break;
        case 12:
            v1Type = 3;
            reulst = { votes: args.map(function (v) { return "-" + v; }).join(',') };
            break;
        case 200:
            v1Type = 5;
            break;
        case 204:
            v1Type = 6;
            break;
        case 205:
            v1Type = 7;
            break;
        case 100:
            v1Type = 9;
            break;
        case 101:
            v1Type = 10;
            break;
        case 102:
            v1Type = 13;
            break;
        case 103:
            v1Type = 14;
            result = {
                asset: { uiaTransfer: { currency: args[0], amount: String(args[1]) } },
                recipientId: args[2],
            };
            break;
        case 4:
            v1Type = 100;
            break;
    }
    result.recipientId = result.recipientId || '';
    return Object.assign(result, { type: v1Type, args: v1Args, argsNew: args });
}
Transactions.prototype.toAPIV1Transaction = function (trans, block) {
    if (!trans)
        return trans;
    var signArray = trans.signatures;
    var resultTrans = {
        id: trans.tid,
        height: trans.height,
        timestamp: trans.timestamp,
        senderPublicKey: trans.senderPublicKey,
        senderId: trans.senderId,
        signSignature: trans.signSignature,
        message: trans.message,
        fee: trans.fee,
        blockId: block ? block.id : undefined,
        recipientId: '',
        amount: 0,
        asset: {},
        confirmations: modules.blocks.getLastBlock().height - trans.height,
        type: -1,
        signature: signArray.length === 1 ? signArray[0] : null,
        signatures: signArray.length === 1 ? null : signArray,
        args: {},
    };
    return Object.assign(resultTrans, toV1TypeAndArgs(trans.type, trans.args));
};
Transactions.prototype.addTransactionUnsigned = function (transaction, cb) {
    shared.addTransactionUnsigned({ body: transaction }, cb);
};
Transactions.prototype.sandboxApi = function (call, args, cb) {
    sandboxHelper.callMethod(shared, call, args, cb);
};
Transactions.prototype.list = function (query, cb) { return priv.list(query, cb); };
Transactions.prototype.getById = function (id, cb) { return priv.getById(id, cb); };
Transactions.prototype.onBind = function (scope) {
    modules = scope;
};
Transactions.prototype.getTransactionsForV1 = function (req, cb) {
    return shared.getTransactions(req, cb);
};
shared.getTransactions = function (req, cb) {
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
            id: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
            },
            blockId: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        var limit = query.limit || 100;
        var offset = query.offset || 0;
        var condition = {};
        if (query.senderId) {
            condition.senderId = query.senderId;
        }
        if (query.type !== undefined) {
            var type = Number(query.type);
            if (type !== 0 && type !== 14)
                return cb('invalid transaction type');
            condition.currency = type === 0 ? 'AEC' : { $ne: 'AEC' };
        }
        if (query.id) {
            condition.tid = query.id;
        }
        (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var block, count, transfer, transactions, e_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            block = void 0;
                            if (!query.blockId)
                                return [3, 2];
                            return [4, app.sdb.getBlockById(query.blockId)];
                        case 1:
                            block = _a.sent();
                            if (block === undefined) {
                                return [2, cb(null, { transactions: [], count: 0 })];
                            }
                            condition.height = block.height;
                            _a.label = 2;
                        case 2: return [4, app.sdb.count('Transfer', condition)];
                        case 3:
                            count = _a.sent();
                            return [4, app.sdb.find('Transfer', condition, query.unlimited ? {} : { limit: limit, offset: offset })];
                        case 4:
                            transfer = _a.sent();
                            if (!transfer)
                                transfer = [];
                            block = modules.blocks.toAPIV1Block(block);
                            return [4, self.tranfersToAPIV1Transactions(transfer, block)];
                        case 5:
                            transactions = _a.sent();
                            return [2, cb(null, { transactions: transactions, count: count })];
                        case 6:
                            e_7 = _a.sent();
                            app.logger.error('Failed to get transactions', e_7);
                            return [2, cb("System error: " + e_7)];
                        case 7: return [2];
                    }
                });
            });
        })();
        return null;
    });
};
shared.getTransaction = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
            },
        },
        required: ['id'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        var callback = function (err2, ret) {
            return (function () {
                return __awaiter(_this, void 0, void 0, function () {
                    var transaction;
                    return __generator(this, function (_a) {
                        if (err2)
                            return [2, cb(err2)];
                        if (!ret || !ret.transactions || ret.transactions.length < 1) {
                            cb('transaction not found', ret);
                        }
                        else {
                            transaction = ret.transactions[0];
                            transaction.height = String(transaction.height);
                            transaction.confirmations = String(transaction.confirmations);
                            cb(null, { transaction: transaction });
                        }
                        return [2];
                    });
                });
            })();
        };
        return shared.getTransactions(req, callback);
    });
};
shared.getUnconfirmedTransaction = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
                maxLength: 64,
            },
        },
        required: ['id'],
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        var unconfirmedTransaction = self.getUnconfirmedTransaction(query.id);
        return !unconfirmedTransaction
            ? cb('Transaction not found')
            : cb(null, { transaction: unconfirmedTransaction });
    });
};
shared.getUnconfirmedTransactions = function (req, cb) {
    var query = req.body;
    library.scheme.validate(query, {
        type: 'object',
        properties: {
            senderPublicKey: {
                type: 'string',
                format: 'publicKey',
            },
            address: {
                type: 'string',
            },
        },
    }, function (err) {
        if (err) {
            return cb(err[0].message);
        }
        var transactions = self.getUnconfirmedTransactionList(true);
        var toSend = [];
        if (query.senderPublicKey || query.address) {
            for (var i = 0; i < transactions.length; i++) {
                if (transactions[i].senderPublicKey === query.senderPublicKey
                    || transactions[i].recipientId === query.address) {
                    toSend.push(transactions[i]);
                }
            }
        }
        else {
            transactions.forEach(function (t) { return toSend.push(t); });
        }
        return cb(null, { transactions: toSend });
    });
};
function convertV1Transfer(trans) {
    if (trans.type === 0 && trans.amount !== undefined && trans.recipientId !== undefined) {
        trans.type = 1;
        trans.args = [trans.amount, trans.recipientId];
        Reflect.deleteProperty(trans, 'amount');
        Reflect.deleteProperty(trans, 'recipientId');
    }
}
shared.addTransactionUnsigned = function (req, cb) {
    var query = req.body;
    if (query.type !== undefined) {
        query.type = Number(query.type);
        convertV1Transfer(query);
    }
    var valid = library.scheme.validate(query, {
        type: 'object',
        properties: {
            secret: { type: 'string', maxLength: 100 },
            fee: { type: 'integer', min: 1 },
            type: { type: 'integer', min: 1 },
            args: { type: 'array' },
            message: { type: 'string', maxLength: 50 },
            senderId: { type: 'string', maxLength: 50 },
            mode: { type: 'integer', min: 0, max: 1 },
        },
        required: ['secret', 'fee', 'type'],
    });
    if (!valid) {
        library.logger.warn('Failed to validate query params', library.scheme.getLastError());
        return setImmediate(cb, library.scheme.getLastError().details[0].message);
    }
    library.sequence.add(function (callback) {
        (function () {
            return __awaiter(_this, void 0, void 0, function () {
                var hash, keypair, secondKeypair, trs, e_8;
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
                                fee: query.fee,
                                type: query.type,
                                senderId: query.senderId || null,
                                args: query.args || null,
                                message: query.message || null,
                                secondKeypair: secondKeypair,
                                keypair: keypair,
                                mode: query.mode,
                            });
                            return [4, self.processUnconfirmedTransactionAsync(trs)];
                        case 1:
                            _a.sent();
                            library.bus.message('unconfirmedTransaction', trs);
                            callback(null, { transactionId: trs.id });
                            return [3, 3];
                        case 2:
                            e_8 = _a.sent();
                            library.logger.warn('Failed to process unsigned transaction', e_8);
                            callback(e_8.toString());
                            return [3, 3];
                        case 3: return [2];
                    }
                });
            });
        })();
    }, cb);
    return null;
};
shared.addTransactions = function (req, cb) {
    if (!req.body || !req.body.transactions) {
        return cb('Invalid params');
    }
    var trs = req.body.transactions;
    try {
        for (var _i = 0, trs_1 = trs; _i < trs_1.length; _i++) {
            var t = trs_1[_i];
            library.base.transaction.objectNormalize(t);
        }
    }
    catch (e) {
        return cb("Invalid transaction body: " + e.toString());
    }
    return library.sequence.add(function (callback) {
        self.processUnconfirmedTransactions(trs, callback);
    }, cb);
};
module.exports = Transactions;
