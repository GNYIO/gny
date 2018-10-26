"use strict";
var crypto = require('crypto');
var ByteBuffer = require('bytebuffer');
var ed = require('../utils/ed.js');
var BlockStatus = require('../utils/block-status.js');
var constants = require('../utils/constants.js');
var prv = {};
prv.getAddressByPublicKey = function (publicKey) {
    var publicKeyHash = crypto.createHash('sha256').update(publicKey, 'hex').digest();
    var temp = Buffer.alloc(8);
    for (var i = 0; i < 8; i++) {
        temp[i] = publicKeyHash[7 - i];
    }
    var address = app.util.bignumber.fromBuffer(temp).toString();
    return address;
};
var self;
function Block(scope) {
    self = this;
    this.scope = scope;
    prv.blockStatus = new BlockStatus();
}
Block.prototype.sortTransactions = function (data) {
    return data.transactions.sort(function (a, b) {
        if (a.type === b.type) {
            if (a.type === 1) {
                return 1;
            }
            if (b.type === 1) {
                return -1;
            }
            return a.type - b.type;
        }
        if (a.amount !== b.amount) {
            return a.amount - b.amount;
        }
        return a.id.localeCompare(b.id);
    });
};
Block.prototype.create = function (data) {
    var transactions = self.sortTransactions(data);
    var nextHeight = (data.previousBlock) ? data.previousBlock.height + 1 : 1;
    var reward = prv.blockStatus.calcReward(nextHeight);
    var totalFee = 0;
    var totalAmount = 0;
    var size = 0;
    var blockTransactions = [];
    var payloadHash = crypto.createHash('sha256');
    for (var i = 0; i < transactions.length; i++) {
        var transaction = transactions[i];
        var bytes = self.scope.transaction.getBytes(transaction);
        if (size + bytes.length > constants.maxPayloadLength) {
            break;
        }
        size += bytes.length;
        totalFee += transaction.fee;
        totalAmount += transaction.amount;
        blockTransactions.push(transaction);
        payloadHash.update(bytes);
    }
    var block = {
        version: 0,
        totalAmount: totalAmount,
        totalFee: totalFee,
        reward: reward,
        payloadHash: payloadHash.digest().toString('hex'),
        timestamp: data.timestamp,
        numberOfTransactions: blockTransactions.length,
        payloadLength: size,
        previousBlock: data.previousBlock.id,
        generatorPublicKey: data.keypair.publicKey.toString('hex'),
        transactions: blockTransactions,
    };
    try {
        block.blockSignature = self.sign(block, data.keypair);
        block = self.objectNormalize(block);
    }
    catch (e) {
        throw Error(e.toString());
    }
    return block;
};
Block.prototype.sign = function (block, keypair) {
    var hash = self.getHash(block);
    return ed.Sign(hash, keypair).toString('hex');
};
Block.prototype.getBytes = function (block, skipSignature) {
    var size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64;
    var bb = new ByteBuffer(size, true);
    bb.writeInt(block.version);
    bb.writeInt(block.timestamp);
    bb.writeLong(block.height);
    bb.writeInt(block.count);
    bb.writeLong(block.fees);
    bb.writeLong(block.reward);
    bb.writeString(block.delegate);
    if (block.prevBlockId) {
        bb.writeString(block.prevBlockId);
    }
    else {
        bb.writeString('0');
    }
    var payloadHashBuffer = Buffer.from(block.payloadHash, 'hex');
    for (var i = 0; i < payloadHashBuffer.length; i++) {
        bb.writeByte(payloadHashBuffer[i]);
    }
    if (!skipSignature && block.signature) {
        var signatureBuffer = Buffer.from(block.signature, 'hex');
        for (var i = 0; i < signatureBuffer.length; i++) {
            bb.writeByte(signatureBuffer[i]);
        }
    }
    bb.flip();
    var b = bb.toBuffer();
    return b;
};
Block.prototype.verifySignature = function (block) {
    var remove = 64;
    try {
        var data = self.getBytes(block);
        var data2 = Buffer.alloc(data.length - remove);
        for (var i = 0; i < data2.length; i++) {
            data2[i] = data[i];
        }
        var hash = crypto.createHash('sha256').update(data2).digest();
        var blockSignatureBuffer = Buffer.from(block.signature, 'hex');
        var generatorPublicKeyBuffer = Buffer.from(block.delegate, 'hex');
        return ed.Verify(hash, blockSignatureBuffer || ' ', generatorPublicKeyBuffer || ' ');
    }
    catch (e) {
        throw Error(e.toString());
    }
};
Block.prototype.objectNormalize = function (block) {
    for (var i in block) {
        if (block[i] == null || typeof block[i] === 'undefined') {
            delete block[i];
        }
        if (Buffer.isBuffer(block[i])) {
            block[i] = block[i].toString();
        }
    }
    var report = self.scope.scheme.validate(block, {
        type: 'object',
        properties: {
            id: {
                type: 'string',
            },
            height: {
                type: 'integer',
            },
            signature: {
                type: 'string',
                format: 'signature',
            },
            delegate: {
                type: 'string',
                format: 'publicKey',
            },
            payloadHash: {
                type: 'string',
                format: 'hex',
            },
            payloadLength: {
                type: 'integer',
            },
            prevBlockId: {
                type: 'string',
            },
            timestamp: {
                type: 'integer',
            },
            transactions: {
                type: 'array',
                uniqueItems: true,
            },
            version: {
                type: 'integer',
                minimum: 0,
            },
            reward: {
                type: 'integer',
                minimum: 0,
            },
        },
        required: ['signature', 'delegate', 'payloadHash', 'timestamp', 'transactions', 'version', 'reward'],
    });
    if (!report) {
        throw Error(self.scope.scheme.getLastError());
    }
    try {
        for (var i = 0; i < block.transactions.length; i++) {
            block.transactions[i] = self.scope.transaction.objectNormalize(block.transactions[i]);
        }
    }
    catch (e) {
        throw Error(e.toString());
    }
    return block;
};
Block.prototype.getId = function (block) { return self.getId2(block); };
Block.prototype.getId_old = function (block) {
    if (global.featureSwitch.enableLongId) {
        return self.getId2(block);
    }
    var hash = crypto.createHash('sha256').update(self.getBytes(block)).digest();
    var temp = Buffer.alloc(8);
    for (var i = 0; i < 8; i++) {
        temp[i] = hash[7 - i];
    }
    var id = app.util.bignumber.fromBuffer(temp).toString();
    return id;
};
Block.prototype.getId2 = function (block) {
    var hash = crypto.createHash('sha256').update(self.getBytes(block)).digest();
    return hash.toString('hex');
};
Block.prototype.getHash = function (block) { return crypto.createHash('sha256').update(self.getBytes(block)).digest(); };
Block.prototype.calculateFee = function () { return 10000000; };
Block.prototype.dbRead = function (raw) {
    if (!raw.b_id) {
        return null;
    }
    var block = {
        id: raw.b_id,
        version: parseInt(raw.b_version, 10),
        timestamp: parseInt(raw.b_timestamp, 10),
        height: parseInt(raw.b_height, 10),
        previousBlock: raw.b_previousBlock,
        numberOfTransactions: parseInt(raw.b_numberOfTransactions, 10),
        totalAmount: parseInt(raw.b_totalAmount, 10),
        totalFee: parseInt(raw.b_totalFee, 10),
        reward: parseInt(raw.b_reward, 10),
        payloadLength: parseInt(raw.b_payloadLength, 10),
        payloadHash: raw.b_payloadHash,
        generatorPublicKey: raw.b_generatorPublicKey,
        generatorId: prv.getAddressByPublicKey(raw.b_generatorPublicKey),
        blockSignature: raw.b_blockSignature,
        confirmations: raw.b_confirmations,
    };
    block.totalForged = (block.totalFee + block.reward);
    return block;
};
module.exports = Block;
