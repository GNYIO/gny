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
var ByteBuffer = require('bytebuffer');
var ed = require('../utils/ed.js');
var constants = require('../utils/constants.js');
var slots = require('../utils/slots.js');
var addressHelper = require('../utils/address.js');
var feeCalculators = require('../utils/calculate-fee.js');
var transactionMode = require('../utils/transaction-mode.js');
var self;
function Transaction(scope) {
    self = this;
    this.scope = scope;
}
var prv = {};
prv.types = {};
Transaction.prototype.create = function (data) {
    var trs = {
        type: data.type,
        senderId: data.senderId,
        senderPublicKey: data.keypair.publicKey.toString('hex'),
        timestamp: slots.getTime(),
        message: data.message,
        args: data.args,
        fee: data.fee,
        mode: data.mode,
    };
    var signerId = addressHelper.generateNormalAddress(trs.senderPublicKey);
    if (transactionMode.isDirectMode(trs.mode)) {
        trs.senderId = signerId;
    }
    else if (transactionMode.isRequestMode(trs.mode)) {
        if (!trs.senderId)
            throw new Error('No senderId was provided in request mode');
        trs.requestorId = signerId;
    }
    else {
        throw new Error('Unexpected transaction mode');
    }
    trs.signatures = [self.sign(data.keypair, trs)];
    if (data.secondKeypair) {
        trs.secondSignature = self.sign(data.secondKeypair, trs);
    }
    trs.id = self.getId(trs);
    return trs;
};
Transaction.prototype.attachAssetType = function (typeId, instance) {
    if (instance && typeof instance.create === 'function' && typeof instance.getBytes === 'function'
        && typeof instance.calculateFee === 'function' && typeof instance.verify === 'function'
        && typeof instance.objectNormalize === 'function' && typeof instance.dbRead === 'function'
        && typeof instance.apply === 'function' && typeof instance.undo === 'function'
        && typeof instance.applyUnconfirmed === 'function' && typeof instance.undoUnconfirmed === 'function'
        && typeof instance.ready === 'function' && typeof instance.process === 'function') {
        prv.types[typeId] = instance;
    }
    else {
        throw Error('Invalid instance interface');
    }
};
Transaction.prototype.sign = function (keypair, trs) {
    var hash = crypto.createHash('sha256').update(self.getBytes(trs, true, true)).digest();
    return ed.Sign(hash, keypair).toString('hex');
};
Transaction.prototype.multisign = function (keypair, trs) {
    var bytes = self.getBytes(trs, true, true);
    var hash = crypto.createHash('sha256').update(bytes).digest();
    return ed.Sign(hash, keypair).toString('hex');
};
Transaction.prototype.getId = function (trs) { return self.getId2(trs); };
Transaction.prototype.getId2 = function (trs) { return self.getHash(trs).toString('hex'); };
Transaction.prototype.getHash = function (trs) { return crypto.createHash('sha256').update(self.getBytes(trs)).digest(); };
Transaction.prototype.getBytes = function (trs, skipSignature, skipSecondSignature) {
    var bb = new ByteBuffer(1, true);
    bb.writeInt(trs.type);
    bb.writeInt(trs.timestamp);
    bb.writeLong(trs.fee);
    bb.writeString(trs.senderId);
    if (trs.requestorId) {
        bb.writeString(trs.requestorId);
    }
    if (trs.mode) {
        bb.writeInt(trs.mode);
    }
    if (trs.message)
        bb.writeString(trs.message);
    if (trs.args) {
        var args = void 0;
        if (typeof trs.args === 'string') {
            args = trs.args;
        }
        else if (Array.isArray(trs.args)) {
            args = JSON.stringify(trs.args);
        }
        else {
            throw new Error('Invalid transaction args');
        }
        bb.writeString(args);
    }
    if (!skipSignature && trs.signatures) {
        for (var _i = 0, _a = trs.signatures; _i < _a.length; _i++) {
            var signature = _a[_i];
            var signatureBuffer = Buffer.from(signature, 'hex');
            for (var i = 0; i < signatureBuffer.length; i++) {
                bb.writeByte(signatureBuffer[i]);
            }
        }
    }
    if (!skipSecondSignature && trs.secondSignature) {
        var secondSignatureBuffer = Buffer.from(trs.secondSignature, 'hex');
        for (var i = 0; i < secondSignatureBuffer.length; i++) {
            bb.writeByte(secondSignatureBuffer[i]);
        }
    }
    bb.flip();
    return bb.toBuffer();
};
Transaction.prototype.verifyNormalSignature = function (trs, requestor, bytes) {
    if (!self.verifyBytes(bytes, trs.senderPublicKey, trs.signatures[0])) {
        return 'Invalid signature';
    }
    if (requestor.secondPublicKey) {
        if (!trs.secondSignature)
            return 'Second signature not provided';
        if (!self.verifyBytes(bytes, requestor.secondPublicKey, trs.secondSignature)) {
            return 'Invalid second signature';
        }
    }
    return undefined;
};
Transaction.prototype.verifyGroupSignature = function (trs, sender, bytes) {
    return __awaiter(_this, void 0, void 0, function () {
        var group, groupMembers, memberMap, _i, groupMembers_1, item, totalWeight, _a, _b, ks, k, address, _c, _d, ks, key, signature;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4, app.sdb.findOne('Group', { condition: { name: sender.name } })];
                case 1:
                    group = _e.sent();
                    if (!group)
                        return [2, 'Group not found'];
                    return [4, app.sdb.findAll('GroupMember', { condition: { name: sender.name } })];
                case 2:
                    groupMembers = _e.sent();
                    if (!groupMembers)
                        return [2, 'Group members not found'];
                    memberMap = new Map();
                    for (_i = 0, groupMembers_1 = groupMembers; _i < groupMembers_1.length; _i++) {
                        item = groupMembers_1[_i];
                        memberMap.set(item.member, item);
                    }
                    totalWeight = 0;
                    for (_a = 0, _b = trs.signatures; _a < _b.length; _a++) {
                        ks = _b[_a];
                        k = ks.substr(0, 64);
                        address = addressHelper.generateNormalAddress(k);
                        if (!memberMap.has(address))
                            return [2, 'Invalid member address'];
                        totalWeight += memberMap.get(address).weight;
                    }
                    if (totalWeight < group.m)
                        return [2, 'Signature weight not enough'];
                    for (_c = 0, _d = trs.signatures; _c < _d.length; _c++) {
                        ks = _d[_c];
                        if (ks.length !== 192)
                            return [2, 'Invalid key-signature format'];
                        key = ks.substr(0, 64);
                        signature = ks.substr(64, 192);
                        if (!self.verifyBytes(bytes, key, signature)) {
                            return [2, 'Invalid multi signatures'];
                        }
                    }
                    return [2, undefined];
            }
        });
    });
};
Transaction.prototype.verifyChainSignature = function (trs, sender, bytes) {
    return __awaiter(_this, void 0, void 0, function () {
        var chain, validators, validatorPublicKeySet, _i, validators_1, v, validSignatureNumber, _a, _b, s, k, _c, _d, ks, key, signature;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4, app.sdb.findOne('Chain', { condition: { address: sender.senderId } })];
                case 1:
                    chain = _e.sent();
                    if (!chain)
                        return [2, 'Chain not found'];
                    return [4, app.sdb.findAll('ChainDelegate', { condition: { address: sender.senderId } })];
                case 2:
                    validators = _e.sent();
                    if (!validators || !validators.length)
                        return [2, 'Chain delegates not found'];
                    validatorPublicKeySet = new Set();
                    for (_i = 0, validators_1 = validators; _i < validators_1.length; _i++) {
                        v = validators_1[_i];
                        validatorPublicKeySet.add(v.delegate);
                    }
                    validSignatureNumber = 0;
                    for (_a = 0, _b = trs.signatures; _a < _b.length; _a++) {
                        s = _b[_a];
                        k = s.substr(0, 64);
                        if (validatorPublicKeySet.has(k)) {
                            validSignatureNumber++;
                        }
                    }
                    if (validSignatureNumber < chain.unlockNumber)
                        return [2, 'Signature not enough'];
                    for (_c = 0, _d = trs.signatures; _c < _d.length; _c++) {
                        ks = _d[_c];
                        if (ks.length !== 192)
                            return [2, 'Invalid key-signature format'];
                        key = ks.substr(0, 64);
                        signature = ks.substr(64, 192);
                        if (!self.verifyBytes(bytes, key, signature)) {
                            return [2, 'Invalid multi signatures'];
                        }
                    }
                    return [2, undefined];
            }
        });
    });
};
Transaction.prototype.verify = function (context) {
    return __awaiter(_this, void 0, void 0, function () {
        var trs, sender, requestor, feeCalculator, minFee, bytes, error, ADDRESS_TYPE, addrType, error, error, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    trs = context.trs, sender = context.sender, requestor = context.requestor;
                    if (slots.getSlotNumber(trs.timestamp) > slots.getSlotNumber()) {
                        return [2, 'Invalid transaction timestamp'];
                    }
                    if (!trs.type) {
                        return [2, 'Invalid function'];
                    }
                    feeCalculator = feeCalculators[trs.type];
                    if (!feeCalculator)
                        return [2, 'Fee calculator not found'];
                    minFee = constants.fixedPoint * feeCalculator(trs);
                    if (trs.fee < minFee)
                        return [2, 'Fee not enough'];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    bytes = self.getBytes(trs, true, true);
                    if (trs.senderPublicKey) {
                        error = self.verifyNormalSignature(trs, requestor, bytes);
                        if (error)
                            return [2, error];
                    }
                    if (!(!trs.senderPublicKey && trs.signatures && trs.signatures.length > 1))
                        return [3, 6];
                    ADDRESS_TYPE = app.util.address.TYPE;
                    addrType = app.util.address.getType(trs.senderId);
                    if (!(addrType === ADDRESS_TYPE.CHAIN))
                        return [3, 3];
                    return [4, self.verifyChainSignature(trs, sender, bytes)];
                case 2:
                    error = _a.sent();
                    if (error)
                        return [2, error];
                    return [3, 6];
                case 3:
                    if (!(addrType === ADDRESS_TYPE.GROUP))
                        return [3, 5];
                    return [4, self.verifyGroupSignature(trs, sender, bytes)];
                case 4:
                    error = _a.sent();
                    if (error)
                        return [2, error];
                    return [3, 6];
                case 5: return [2, 'Invalid account type'];
                case 6: return [3, 8];
                case 7:
                    e_1 = _a.sent();
                    library.logger.error('verify signature excpetion', e_1);
                    return [2, 'Faied to verify signature'];
                case 8: return [2, undefined];
            }
        });
    });
};
Transaction.prototype.verifySignature = function (trs, publicKey, signature) {
    if (!signature)
        return false;
    try {
        var bytes = self.getBytes(trs, true, true);
        return self.verifyBytes(bytes, publicKey, signature);
    }
    catch (e) {
        throw Error(e.toString());
    }
};
Transaction.prototype.verifyBytes = function (bytes, publicKey, signature) {
    try {
        var data2 = Buffer.alloc(bytes.length);
        for (var i = 0; i < data2.length; i++) {
            data2[i] = bytes[i];
        }
        var hash = crypto.createHash('sha256').update(data2).digest();
        var signatureBuffer = Buffer.from(signature, 'hex');
        var publicKeyBuffer = Buffer.from(publicKey, 'hex');
        return ed.Verify(hash, signatureBuffer || ' ', publicKeyBuffer || ' ');
    }
    catch (e) {
        throw Error(e.toString());
    }
};
Transaction.prototype.apply = function (context) {
    return __awaiter(_this, void 0, void 0, function () {
        var block, trs, sender, requestor, name, _a, mod, func, fn, requestorFee, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    block = context.block, trs = context.trs, sender = context.sender, requestor = context.requestor;
                    name = app.getContractName(trs.type);
                    if (!name) {
                        throw new Error("Unsupported transaction type: " + trs.type);
                    }
                    _a = name.split('.'), mod = _a[0], func = _a[1];
                    if (!mod || !func) {
                        throw new Error('Invalid transaction function');
                    }
                    fn = app.contract[mod][func];
                    if (!fn) {
                        throw new Error('Contract not found');
                    }
                    if (block.height !== 0) {
                        if (transactionMode.isRequestMode(trs.mode) && !context.activating) {
                            requestorFee = 20000000;
                            if (requestor.aec < requestorFee)
                                throw new Error('Insufficient requestor balance');
                            requestor.aec -= requestorFee;
                            app.addRoundFee(requestorFee, modules.round.calc(block.height));
                            app.sdb.create('TransactionStatu', { tid: trs.id, executed: 0 });
                            app.sdb.update('Account', { aec: requestor.aec }, { address: requestor.address });
                            return [2];
                        }
                        if (sender.aec < trs.fee)
                            throw new Error('Insufficient sender balance');
                        sender.aec -= trs.fee;
                        app.sdb.update('Account', { aec: sender.aec }, { address: sender.address });
                    }
                    return [4, fn.apply(context, trs.args)];
                case 1:
                    error = _b.sent();
                    if (error) {
                        throw new Error(error);
                    }
                    return [2];
            }
        });
    });
};
Transaction.prototype.objectNormalize = function (trs) {
    for (var i in trs) {
        if (trs[i] === null || typeof trs[i] === 'undefined') {
            delete trs[i];
        }
        if (Buffer.isBuffer(trs[i])) {
            trs[i] = trs[i].toString();
        }
    }
    if (trs.args && typeof trs.args === 'string') {
        try {
            trs.args = JSON.parse(trs.args);
            if (!Array.isArray(trs.args))
                throw new Error('Transaction args must be json array');
        }
        catch (e) {
            throw new Error("Failed to parse args: " + e);
        }
    }
    if (trs.signatures && typeof trs.signatures === 'string') {
        try {
            trs.signatures = JSON.parse(trs.signatures);
        }
        catch (e) {
            throw new Error("Failed to parse signatures: " + e);
        }
    }
    var report = self.scope.scheme.validate(trs, {
        type: 'object',
        properties: {
            id: { type: 'string' },
            height: { type: 'integer' },
            type: { type: 'integer' },
            timestamp: { type: 'integer' },
            senderId: { type: 'string' },
            fee: { type: 'integer', minimum: 0, maximum: constants.totalAmount },
            secondSignature: { type: 'string', format: 'signature' },
            signatures: { type: 'array' },
            message: { type: 'string', maxLength: 256 },
        },
        required: ['type', 'timestamp', 'senderId', 'signatures'],
    });
    if (!report) {
        library.logger.error("Failed to normalize transaction body: " + self.scope.scheme.getLastError().details[0].message, trs);
        throw Error(self.scope.scheme.getLastError());
    }
    return trs;
};
module.exports = Transaction;
