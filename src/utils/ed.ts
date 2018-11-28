const sodium = require('sodium').api;

export function generateKeyPair(hash: Buffer) {
  const keypair = sodium.crypto_sign_seed_keypair(hash);
  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
  };
}

export function sign(hash: Buffer, privateKey: Buffer) {
  return sodium.crypto_sign_detached(hash, privateKey);
}

export function verify(hash: Buffer, signature: Buffer, publicKey: Buffer) {
  return sodium.crypto_sign_verify_detached(signature, hash, publicKey);
}
