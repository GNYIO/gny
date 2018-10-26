"use strict";
const sodium_1 = require("sodium");
const sodium = sodium_1.api;
module.exports = {
    MakeKeypair(hash) {
        const keypair = sodium.crypto_sign_seed_keypair(hash);
        return {
            publicKey: keypair.publicKey,
            privateKey: keypair.secretKey,
        };
    },
    Sign(hash, keypair) {
        return sodium.crypto_sign_detached(hash, Buffer.from(keypair.privateKey, 'hex'));
    },
    Verify(hash, signatureBuffer, publicKeyBuffer) {
        return sodium.crypto_sign_verify_detached(signatureBuffer, hash, publicKeyBuffer);
    },
};
