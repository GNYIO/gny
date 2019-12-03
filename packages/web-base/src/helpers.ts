import { cloneDeep } from 'lodash';
import * as sha256 from 'fast-sha256';
import * as webEd from '@gny/web-ed';
import * as Mnemonic from 'bitcore-mnemonic';

export function copyObject<T>(obj: T) {
  return cloneDeep<T>(obj);
}

export function toLocalBuffer(buf: ByteBuffer) {
  if (typeof window !== 'undefined') {
    return new Uint8Array(buf.toArrayBuffer());
  } else {
    return buf.toBuffer();
  }
}

export function sha256Bytes(data: Uint8Array) {
  return sha256.hash(data);
}

export function getKeys(secret: string) {
  const hash = sha256Bytes(Buffer.from(secret));
  const keypair = webEd.generateKeyPair(hash);

  return {
    keypair,
    publicKey: Buffer.from(keypair.publicKey).toString('hex'),
    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
  };
}

export function generateSecret(): string {
  return new Mnemonic(Mnemonic.Words.ENGLISH).toString();
}
