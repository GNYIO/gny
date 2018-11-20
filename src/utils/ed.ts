import { api } from 'sodium';
const sodium = api;

export function generateKeyPair(hash: any) {
  const keypair = sodium.crypto_sign_seed_keypair(hash);
  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
  };
}

export function sign(hash: any, keyPair: any) {
  return sodium.crypto_sign_detached(hash, Buffer.from(keyPair.privateKey, 'hex'));
}

export function verify(hash: any, signatureBuffer: any, publicKeyBuffer: any) {
  return sodium.crypto_sign_verify_detached(signatureBuffer, hash, publicKeyBuffer);
}
