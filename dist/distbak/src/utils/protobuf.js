"use strict";
var fs = require('fs');
var protocolBuffers = require('protocol-buffers');
var _ = require('lodash');
var Protobuf = (function () {
    function Protobuf(schema) {
        this.schema = schema;
    }
    Protobuf.prototype.encodeBlock = function (block) {
        var obj = _.cloneDeep(block);
        obj.payloadHash = Buffer.from(obj.payloadHash, 'hex');
        obj.generatorPublicKey = Buffer.from(obj.generatorPublicKey, 'hex');
        if (obj.blockSignature) {
            obj.blockSignature = Buffer.from(obj.blockSignature, 'hex');
        }
        for (var i = 0; i < obj.transactions.length; ++i) {
        }
        return this.schema.Block.encode(obj);
    };
    Protobuf.prototype.decodeBlock = function (data) {
        var obj = this.schema.Block.decode(data);
        obj.payloadHash = obj.payloadHash.toString('hex');
        obj.generatorPublicKey = obj.generatorPublicKey.toString('hex');
        if (obj.blockSignature) {
            obj.blockSignature = obj.blockSignature.toString('hex');
        }
        for (var i = 0; i < obj.transactions.length; ++i) {
        }
        return obj;
    };
    Protobuf.prototype.encodeBlockPropose = function (propose) {
        var obj = _.cloneDeep(propose);
        obj.generatorPublicKey = Buffer.from(obj.generatorPublicKey, 'hex');
        obj.hash = Buffer.from(obj.hash, 'hex');
        obj.signature = Buffer.from(obj.signature, 'hex');
        return this.schema.BlockPropose.encode(obj);
    };
    Protobuf.prototype.decodeBlockPropose = function (data) {
        var obj = this.schema.BlockPropose.decode(data);
        obj.generatorPublicKey = obj.generatorPublicKey.toString('hex');
        obj.hash = obj.hash.toString('hex');
        obj.signature = obj.signature.toString('hex');
        return obj;
    };
    Protobuf.prototype.encodeBlockVotes = function (obj) {
        for (var i = 0; i < obj.signatures.length; ++i) {
            var signature = obj.signatures[i];
            signature.key = Buffer.from(signature.key, 'hex');
            signature.sig = Buffer.from(signature.sig, 'hex');
        }
        return this.schema.BlockVotes.encode(obj);
    };
    Protobuf.prototype.decodeBlockVotes = function (data) {
        var obj = this.schema.BlockVotes.decode(data);
        for (var i = 0; i < obj.signatures.length; ++i) {
            var signature = obj.signatures[i];
            signature.key = signature.key.toString('hex');
            signature.sig = signature.sig.toString('hex');
        }
        return obj;
    };
    Protobuf.prototype.encodeTransaction = function (trs) {
        var obj = _.cloneDeep(trs);
        return this.schema.Transaction.encode(obj);
    };
    Protobuf.prototype.decodeTransaction = function (data) {
        var obj = this.schema.Transaction.decode(data);
        return obj;
    };
    return Protobuf;
}());
module.exports = function (schemaFile, cb) {
    fs.readFile(schemaFile, 'utf8', function (err, data) {
        if (err) {
            return cb("Failed to read proto file: " + err);
        }
        var schema = protocolBuffers(data);
        return cb(null, new Protobuf(schema));
    });
};
