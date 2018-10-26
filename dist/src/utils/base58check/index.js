'use strict';
var assert = require('assert');
var crypto = require('crypto');
var base58 = require('./bs58.js');
function sha256x2(buffer) {
    var tmp = crypto.createHash('sha256').update(buffer).digest();
    return crypto.createHash('sha256').update(tmp).digest();
}
function encode(payload) {
    var checksum = sha256x2(payload);
    return base58.encode(Buffer.concat([
        payload,
        checksum
    ], payload.length + 4));
}
function decodeRaw(buffer) {
    var payload = buffer.slice(0, -4);
    var checksum = buffer.slice(-4);
    var newChecksum = sha256x2(payload);
    if (checksum[0] ^ newChecksum[0] |
        checksum[1] ^ newChecksum[1] |
        checksum[2] ^ newChecksum[2] |
        checksum[3] ^ newChecksum[3])
        return;
    return payload;
}
function decodeUnsafe(string) {
    var buffer = base58.decodeUnsafe(string);
    if (!buffer)
        return;
    return decodeRaw(buffer);
}
function decode(string) {
    var buffer = base58.decode(string);
    var payload = decodeRaw(buffer);
    if (!payload)
        throw new Error('Invalid checksum');
    return payload;
}
module.exports = {
    encode: encode,
    decode: decode,
    decodeUnsafe: decodeUnsafe
};
