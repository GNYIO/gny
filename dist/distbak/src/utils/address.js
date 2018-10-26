"use strict";
var crypto = require('crypto');
var base58check = require('./base58check');
var NORMAL_PREFIX = 'B';
var CHAIN_PREFIX = 'C';
var GROUP_PREFIX = 'G';
var VALID_PREFIX = [
    NORMAL_PREFIX,
    CHAIN_PREFIX,
    GROUP_PREFIX,
];
var TYPE = {
    NONE: 0,
    NORMAL: 1,
    CHAIN: 2,
    GROUP: 3,
};
var PREFIX_MAP = {};
PREFIX_MAP[NORMAL_PREFIX] = TYPE.NORMAL;
PREFIX_MAP[CHAIN_PREFIX] = TYPE.CHAIN;
PREFIX_MAP[GROUP_PREFIX] = TYPE.GROUP;
function generateRawBase58CheckAddress(hashes) {
    if (!hashes || !hashes.length)
        throw new Error('Invalid hashes');
    var h1 = null;
    for (var _i = 0, hashes_1 = hashes; _i < hashes_1.length; _i++) {
        var h = hashes_1[_i];
        if (typeof h === 'string') {
            h = Buffer.from(h, 'hex');
        }
        h1 = crypto.createHash('sha256').update(h);
    }
    var h2 = crypto.createHash('ripemd160').update(h1.digest()).digest();
    return base58check.encode(h2);
}
module.exports = {
    TYPE: TYPE,
    getType: function (address) {
        var prefix = address[0];
        if (PREFIX_MAP[prefix]) {
            return PREFIX_MAP[prefix];
        }
        return TYPE.NONE;
    },
    isAddress: function (address) {
        if (typeof address !== 'string') {
            return false;
        }
        if (!/^[0-9]{1,20}$/g.test(address)) {
            if (!base58check.decodeUnsafe(address.slice(1))) {
                return false;
            }
            if (VALID_PREFIX.indexOf(address[0]) === -1) {
                return false;
            }
        }
        return true;
    },
    isBase58CheckAddress: function (address) {
        if (typeof address !== 'string') {
            return false;
        }
        if (!base58check.decodeUnsafe(address.slice(1))) {
            return false;
        }
        if (VALID_PREFIX.indexOf(address[0]) === -1) {
            return false;
        }
        return true;
    },
    isNormalAddress: function (address) {
        return this.isBase58CheckAddress(address) && address[0] === NORMAL_PREFIX;
    },
    isGroupAddress: function (address) {
        return this.isBase58CheckAddress(address) && address[0] === GROUP_PREFIX;
    },
    generateNormalAddress: function (publicKey) {
        return NORMAL_PREFIX + generateRawBase58CheckAddress([publicKey]);
    },
    generateChainAddress: function (hash) {
        return CHAIN_PREFIX + generateRawBase58CheckAddress([hash]);
    },
    generateGroupAddress: function (name) {
        var hash = crypto.createHash('sha256').update(name).digest();
        return GROUP_PREFIX + generateRawBase58CheckAddress([hash]);
    },
};
