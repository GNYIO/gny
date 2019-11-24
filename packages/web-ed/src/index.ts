import * as nacl from 'tweetnacl';
import { NaclKeyPair } from '@gny/interfaces';

export function generateKeyPair(hash: Uint8Array): NaclKeyPair {
  const keypair = nacl.sign.keyPair.fromSeed(hash);
  return <NaclKeyPair>keypair;
}

export function sign(hash: Uint8Array, secretKey: Uint8Array): Uint8Array {
  const signature = nacl.sign.detached(hash, secretKey);
  return signature;
}

export function verify(
  hash: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  const res = nacl.sign.detached.verify(hash, signature, publicKey);
  return res;
}
