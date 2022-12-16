import lodash from 'lodash';
import * as sha256 from 'fast-sha256';
import * as webEd from '@gny/web-ed';
import { UnconfirmedTransaction } from '@gny/interfaces';
import { TransactionWebBase } from './transactionWebBase.js';
import { Buffer } from 'buffer';

export function copyObject<T>(obj: T) {
  return lodash.cloneDeep<T>(obj);
}

function sha256Bytes(data: Buffer): Buffer {
  const uintBuffer = Uint8Array.from(data);
  const hash = sha256.hash(uintBuffer);
  return Buffer.from(hash);
}

export function getKeys(secret: string) {
  const hash = sha256Bytes(Buffer.from(secret));
  const keypair = webEd.generateKeyPair(hash);

  return {
    keypair,
    publicKey: keypair.publicKey.toString('hex'),
    privateKey: keypair.privateKey.toString('hex'),
  };
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
