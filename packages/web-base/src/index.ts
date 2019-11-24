import * as sha256 from 'fast-sha256';
import * as ByteBuffer from 'bytebuffer';
import { generateAddress } from '@gny/utils';
import * as webEd from '@gny/web-ed';
import {
  ITransaction,
  KeyPair,
  UnconfirmedTransaction,
  NaclKeyPair,
} from '@gny/interfaces';
import * as Mnemonic from 'bitcore-mnemonic';

// export
export * from './transactionWebBase';
export * from './blockWebBase';

interface Keys {
  keypair: NaclKeyPair;
  publicKey: string;
  privateKey: string;
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

export function sha256Hex(data: Uint8Array) {
  return Buffer.from(sha256.hash(data)).toString('hex');
}

export function getBytes(
  trs: UnconfirmedTransaction,
  skipSignature?: boolean,
  skipSecondSignature?: boolean
) {
  const bb = new ByteBuffer(1, true);
  bb.writeInt(trs.type);
  bb.writeInt(trs.timestamp);
  bb.writeInt64((trs.fee as unknown) as number);
  bb.writeString(trs.senderId);

  if (trs.message) bb.writeString(trs.message);
  if (trs.args) {
    let args;
    if (typeof trs.args === 'string') {
      args = trs.args;
    } else if (Array.isArray(trs.args)) {
      args = JSON.stringify(trs.args);
    }
    bb.writeString(args);
  }

  if (!skipSignature && trs.signatures) {
    for (const signature of trs.signatures) {
      const signatureBuffer = Buffer.from(signature, 'hex');
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i]);
      }
    }
  }

  if (!skipSecondSignature && trs.secondSignature) {
    const signSignatureBuffer = Buffer.from(trs.secondSignature, 'hex');
    for (let i = 0; i < signSignatureBuffer.length; i++) {
      bb.writeByte(signSignatureBuffer[i]);
    }
  }

  bb.flip();
  return toLocalBuffer(bb);
}

export function getId(transaction: UnconfirmedTransaction) {
  return sha256Hex(getBytes(transaction));
}

export function getHash(
  transaction: UnconfirmedTransaction,
  skipSignature: boolean,
  skipSecondSignature: boolean
) {
  return sha256Bytes(getBytes(transaction, skipSignature, skipSecondSignature));
}

export function sign(transaction: UnconfirmedTransaction, keys: NaclKeyPair) {
  const hash = getHash(transaction, true, true);
  const signature = webEd.sign(hash, keys.secretKey);

  return Buffer.from(signature).toString('hex');
}

export function secondSign(
  transaction: UnconfirmedTransaction,
  keys: NaclKeyPair
) {
  const hash = getHash(transaction, true, true);
  const signature = webEd.sign(hash, keys.secretKey);
  return Buffer.from(signature).toString('hex');
}

export function signBytes(bytes: string, keys: NaclKeyPair) {
  const hash = sha256Bytes(Buffer.from(bytes, 'hex'));
  const signature = webEd.sign(hash, keys.secretKey);
  return Buffer.from(signature).toString('hex');
}

export function verify(transaction: UnconfirmedTransaction) {
  let remove = 64;

  if (transaction.secondSignature) {
    remove = 128;
  }

  const bytes = getBytes(transaction);
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

export function verifySecondSignature(
  transaction: UnconfirmedTransaction,
  publicKey: string
) {
  const bytes = getBytes(transaction, true, true);
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

export function verifyBytes(
  bytes: string,
  signature: string,
  publicKey: string
) {
  const hash = sha256Bytes(Buffer.from(bytes, 'hex'));
  const signatureBuffer = Buffer.from(signature, 'hex');
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  const res = webEd.verify(hash, signatureBuffer, publicKeyBuffer);
  return res;
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

export let keypair = getKeys;

export function getAddress(publicKey: string) {
  return generateAddress(publicKey);
}

export function generateSecret(): string {
  return new Mnemonic(Mnemonic.Words.ENGLISH).toString();
}

export function fromNaclKeysToKeypair(old: NaclKeyPair) {
  const keypair: KeyPair = {
    privateKey: Buffer.from(old.secretKey),
    publicKey: Buffer.from(old.publicKey),
  };
  return keypair;
}
