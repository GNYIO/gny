import * as nacl from 'tweetnacl';
import { KeyPair } from '@gny/interfaces';
import { Buffer } from 'buffer';

export function generateKeyPair(hash: Buffer): KeyPair {
  const uint = Uint8Array.from(hash);

  const keypair = nacl.sign.keyPair.fromSeed(uint);

  const bufferKeyPair: KeyPair = {
    privateKey: Buffer.from(keypair.secretKey),
    publicKey: Buffer.from(keypair.publicKey),
  };
  return bufferKeyPair;
}

export function sign(hash: Buffer, secretKey: Buffer): Buffer {
  const uintHash = Uint8Array.from(hash);
  const uintSecretKey = Uint8Array.from(secretKey);

  const signature = nacl.sign.detached(uintHash, uintSecretKey);
  return Buffer.from(signature);
}

export function verify(
  hash: Buffer,
  signature: Buffer,
  publicKey: Buffer
): boolean {
  const uintHash = Uint8Array.from(hash);
  const uintSignature = Uint8Array.from(signature);
  const uintPublicKey = Uint8Array.from(publicKey);

  const res = nacl.sign.detached.verify(uintHash, uintSignature, uintPublicKey);
  return res;
}
