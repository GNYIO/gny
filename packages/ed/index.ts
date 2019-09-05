import { api as sodium } from 'sodium';
import { KeyPair } from '../../packages/interfaces';

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export function generateKeyPair(hash: Buffer): KeyPair {
  const keypair = sodium.crypto_sign_seed_keypair(hash);
  return <KeyPair>{
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
  };
}

export function sign(hash: Buffer, privateKey: Buffer): Buffer {
  return sodium.crypto_sign_detached(hash, privateKey);
}

export function verify(
  hash: Buffer,
  signature: Buffer,
  publicKey: Buffer
): boolean {
  return sodium.crypto_sign_verify_detached(signature, hash, publicKey);
}
