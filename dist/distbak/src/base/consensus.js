"use strict";
var assert = require('assert');
var crypto = require('crypto');
var ByteBuffer = require('bytebuffer');
var ip = require('ip');
var ed = require('../utils/ed.js');
var slots = require('../utils/slots.js');
var self;
function Consensus(scope) {
    self = this;
    this.scope = scope;
    this.pendingBlock = null;
    this.pendingVotes = null;
    this.votesKeySet = {};
}
Consensus.prototype.createVotes = function (keypairs, block) {
    var hash = self.getVoteHash(block.height, block.id);
    var votes = {
        height: block.height,
        id: block.id,
        signatures: [],
    };
    keypairs.forEach(function (el) {
        votes.signatures.push({
            key: el.publicKey.toString('hex'),
            sig: ed.Sign(hash, el).toString('hex'),
        });
    });
    return votes;
};
Consensus.prototype.verifyVote = function (height, id, voteItem) {
    try {
        var hash = self.getVoteHash(height, id);
        var signature = Buffer.from(voteItem.sig, 'hex');
        var publicKey = Buffer.from(voteItem.key, 'hex');
        return ed.Verify(hash, signature, publicKey);
    }
    catch (e) {
        return false;
    }
};
Consensus.prototype.getVoteHash = function (height, id) {
    var bytes = new ByteBuffer();
    bytes.writeLong(height);
    if (global.featureSwitch.enableLongId) {
        bytes.writeString(id);
    }
    else {
        var idBytes = app.util.bignumber(id).toBuffer({ size: 8 });
        for (var i = 0; i < 8; i++) {
            bytes.writeByte(idBytes[i]);
        }
    }
    bytes.flip();
    return crypto.createHash('sha256').update(bytes.toBuffer()).digest();
};
Consensus.prototype.hasEnoughVotes = function (votes) {
    return votes && votes.signatures
        && votes.signatures.length > slots.delegates * 2 / 3;
};
Consensus.prototype.hasEnoughVotesRemote = function (votes) {
    return votes && votes.signatures
        && votes.signatures.length >= 6;
};
Consensus.prototype.getPendingBlock = function () { return self.pendingBlock; };
Consensus.prototype.hasPendingBlock = function (timestamp) {
    if (!self.pendingBlock) {
        return false;
    }
    return slots.getSlotNumber(self.pendingBlock.timestamp) === slots.getSlotNumber(timestamp);
};
Consensus.prototype.setPendingBlock = function (block) {
    self.pendingVotes = null;
    self.votesKeySet = {};
    self.pendingBlock = block;
};
Consensus.prototype.clearState = function () {
    self.pendingVotes = null;
    self.votesKeySet = {};
    self.pendingBlock = null;
};
Consensus.prototype.addPendingVotes = function (votes) {
    if (!self.pendingBlock || self.pendingBlock.height !== votes.height
        || self.pendingBlock.id !== votes.id) {
        return self.pendingVotes;
    }
    for (var i = 0; i < votes.signatures.length; ++i) {
        var item = votes.signatures[i];
        if (self.votesKeySet[item.key]) {
            continue;
        }
        if (self.verifyVote(votes.height, votes.id, item)) {
            self.votesKeySet[item.key] = true;
            if (!self.pendingVotes) {
                self.pendingVotes = {
                    height: votes.height,
                    id: votes.id,
                    signatures: [],
                };
            }
            self.pendingVotes.signatures.push(item);
        }
    }
    return self.pendingVotes;
};
Consensus.prototype.createPropose = function (keypair, block, address) {
    assert(keypair.publicKey.toString('hex') === block.delegate);
    var propose = {
        height: block.height,
        id: block.id,
        timestamp: block.timestamp,
        generatorPublicKey: block.delegate,
        address: address,
    };
    var hash = self.getProposeHash(propose);
    propose.hash = hash.toString('hex');
    propose.signature = ed.Sign(hash, keypair).toString('hex');
    return propose;
};
Consensus.prototype.getProposeHash = function (propose) {
    var bytes = new ByteBuffer();
    bytes.writeLong(propose.height);
    if (global.featureSwitch.enableLongId) {
        bytes.writeString(propose.id);
    }
    else {
        var idBytes = app.util.bignumber(propose.id).toBuffer({ size: 8 });
        for (var i = 0; i < 8; i++) {
            bytes.writeByte(idBytes[i]);
        }
    }
    var generatorPublicKeyBuffer = Buffer.from(propose.generatorPublicKey, 'hex');
    for (var i = 0; i < generatorPublicKeyBuffer.length; i++) {
        bytes.writeByte(generatorPublicKeyBuffer[i]);
    }
    bytes.writeInt(propose.timestamp);
    var parts = propose.address.split(':');
    assert(parts.length === 2);
    bytes.writeInt(ip.toLong(parts[0]));
    bytes.writeInt(Number(parts[1]));
    bytes.flip();
    return crypto.createHash('sha256').update(bytes.toBuffer()).digest();
};
Consensus.prototype.normalizeVotes = function (votes) {
    var report = self.scope.scheme.validate(votes, {
        type: 'object',
        properties: {
            height: {
                type: 'integer',
            },
            id: {
                type: 'string',
            },
            signatures: {
                type: 'array',
                minLength: 1,
                maxLength: 101,
            },
        },
        required: ['height', 'id', 'signatures'],
    });
    if (!report) {
        throw Error(self.scope.scheme.getLastError());
    }
    return votes;
};
Consensus.prototype.acceptPropose = function (propose, cb) {
    var hash = self.getProposeHash(propose);
    if (propose.hash !== hash.toString('hex')) {
        return setImmediate(cb, 'Propose hash is not correct');
    }
    try {
        var signature = Buffer.from(propose.signature, 'hex');
        var publicKey = Buffer.from(propose.generatorPublicKey, 'hex');
        if (ed.Verify(hash, signature, publicKey)) {
            return setImmediate(cb);
        }
        return setImmediate(cb, 'Vefify signature failed');
    }
    catch (e) {
        return setImmediate(cb, "Verify signature exception: " + e.toString());
    }
};
module.exports = Consensus;
