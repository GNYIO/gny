import { cloneDeep } from 'lodash';
import * as sha256 from 'fast-sha256';
import * as webEd from '@gny/web-ed';
import * as Mnemonic from 'bitcore-mnemonic';
import { UnconfirmedTransaction } from '@gny/interfaces';
import { TransactionWebBase } from './transactionWebBase';

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

export function verifySecondSignature(
  transaction: UnconfirmedTransaction,
  publicKey: string
) {
  const bytes = TransactionWebBase.getBytes(transaction, true, true);
  const data2 = Buffer.alloc(bytes.length, 0);

  for (let i = 0; i < data2.length; i++) {
    data2[i] = bytes[i];
  }

  const hash = sha256Bytes(data2);

  const signSignatureBuffer = Buffer.from(transaction.secondSignature, 'hex');
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  const res = webEd.verify(hash, signSignatureBuffer, publicKeyBuffer);

  return res;
}

export function verify(transaction: UnconfirmedTransaction) {
  let remove = 64;

  if (transaction.secondSignature) {
    remove = 128;
  }

  const bytes = TransactionWebBase.getBytes(transaction);
  const data2 = Buffer.alloc(bytes.length - remove, 0);

  for (let i = 0; i < data2.length; i++) {
    data2[i] = bytes[i];
  }

  const hash = sha256Bytes(data2);

  const signatureBuffer = Buffer.from(transaction.signatures[0], 'hex');
  const senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
  const res = webEd.verify(hash, signatureBuffer, senderPublicKeyBuffer);

  return res;
}
