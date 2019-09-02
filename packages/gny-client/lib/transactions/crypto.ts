import * as sha256 from 'fast-sha256';
import { AddressHelper } from '../address';

const addressHelper = new AddressHelper();

// if (typeof Buffer === 'undefined') {
//   Buffer = require('buffer/').Buffer;
// }

const ByteBuffer = require('bytebuffer');
const nacl = require('tweetnacl');

const fixedPoint = Math.pow(10, 8);

function getSignatureBytes(signature: any) {
  const bb = new ByteBuffer(32, true);
  const publicKeyBuffer = Buffer.from(signature.publicKey, 'hex');

  for (let i = 0; i < publicKeyBuffer.length; i++) {
    bb.writeByte(publicKeyBuffer[i]);
  }

  bb.flip();
  return new Uint8Array(bb.toArrayBuffer());
}

function toLocalBuffer(buf: any) {
  if (typeof window !== 'undefined') {
    return new Uint8Array(buf.toArrayBuffer());
  } else {
    return buf.toBuffer();
  }
}

function sha256Bytes(data: any) {
  return sha256.hash(data);
}

function sha256Hex(data: any) {
  return Buffer.from(sha256.hash(data)).toString('hex');
}

function getDAppBytes(dapp: any) {
  let buf = Buffer.from([]);
  try {
    const nameBuf = Buffer.from(dapp.name, 'utf8');
    buf = Buffer.concat([buf, nameBuf]);

    if (dapp.description) {
      const descriptionBuf = Buffer.from(dapp.description, 'utf8');
      buf = Buffer.concat([buf, descriptionBuf]);
    }

    if (dapp.tags) {
      const tagsBuf = Buffer.from(dapp.tags, 'utf8');
      buf = Buffer.concat([buf, tagsBuf]);
    }

    if (dapp.link) {
      buf = Buffer.concat([buf, Buffer.from(dapp.link, 'utf8')]);
    }

    if (dapp.icon) {
      buf = Buffer.concat([buf, Buffer.from(dapp.icon, 'utf8')]);
    }

    const bb = new ByteBuffer(1, true);
    bb.writeInt(dapp.type);
    bb.writeInt(dapp.category);
    bb.writeString(dapp.delegates.join(','));
    bb.writeInt(dapp.unlockDelegates);
    bb.flip();

    buf = Buffer.concat([buf, bb.toBuffer()]);
  } catch (e) {
    throw Error(e.toString());
  }

  return buf;
}

function getInTransferBytes(inTransfer: any) {
  let buf = Buffer.from([]);
  try {
    const dappId = Buffer.from(inTransfer.dappId, 'utf8');
    const currency = Buffer.from(inTransfer.currency, 'utf8');
    buf = Buffer.concat([buf, dappId, currency]);
    if (inTransfer.currency !== 'XAS') {
      const amount = Buffer.from(inTransfer.amount, 'utf8');
      buf = Buffer.concat([buf, amount]);
    }
  } catch (e) {
    throw Error(e.toString());
  }

  return buf;
}

function getOutTransferBytes(outTransfer: any) {
  let buf = Buffer.from([]);
  try {
    const dappIdBuf = Buffer.from(outTransfer.dappId, 'utf8');
    const transactionIdBuff = Buffer.from(outTransfer.transactionId, 'utf8');
    const currencyBuff = Buffer.from(outTransfer.currency, 'utf8');
    const amountBuff = Buffer.from(outTransfer.amount, 'utf8');
    buf = Buffer.concat([
      buf,
      dappIdBuf,
      transactionIdBuff,
      currencyBuff,
      amountBuff,
    ]);
  } catch (e) {
    throw Error(e.toString());
  }

  return buf;
}

function getBytes(trs: any, skipSignature?: any, skipSecondSignature?: any) {
  const bb = new ByteBuffer(1, true);
  bb.writeInt(trs.type);
  bb.writeInt(trs.timestamp);
  bb.writeLong(trs.fee);
  bb.writeString(trs.senderId);
  if (trs.requestorId) {
    bb.writeString(trs.requestorId);
  }
  if (trs.mode) {
    bb.writeInt(trs.mode);
  }

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

function getId(transaction: any) {
  return sha256Hex(getBytes(transaction));
}
function getHash(
  transaction: any,
  skipSignature: any,
  skipSecondSignature: any
) {
  return sha256Bytes(getBytes(transaction, skipSignature, skipSecondSignature));
}

function getFee(transaction: any) {
  switch (transaction.type) {
    case 0: // Normal
      return 0.1 * fixedPoint;
      break;

    case 1: // Signature
      return 100 * fixedPoint;
      break;

    case 2: // Delegate
      return 10000 * fixedPoint;
      break;

    case 3: // Vote
      return 1 * fixedPoint;
      break;
  }
}

function sign(transaction: any, keys: any) {
  const hash = getHash(transaction, true, true);
  const signature = nacl.sign.detached(hash, keys.keypair.secretKey);

  return Buffer.from(signature).toString('hex');
}

function secondSign(transaction: any, keys: any) {
  const hash = getHash(transaction, true, true);
  const signature = nacl.sign.detached(hash, keys.keypair.secretKey);
  return Buffer.from(signature).toString('hex');
}

function signBytes(bytes: any, keys: any) {
  const hash = sha256Bytes(Buffer.from(bytes, 'hex'));
  const signature = nacl.sign.detached(hash, keys.keypair.secretKey);
  return Buffer.from(signature).toString('hex');
}

function verify(transaction: any) {
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
  const res = nacl.sign.detached.verify(
    hash,
    signatureBuffer,
    senderPublicKeyBuffer
  );

  return res;
}

function verifySecondSignature(transaction: any, publicKey: any) {
  const bytes = getBytes(transaction, true, true);
  const data2 = Buffer.alloc(bytes.length, 0);

  for (let i = 0; i < data2.length; i++) {
    data2[i] = bytes[i];
  }

  const hash = sha256Bytes(data2);

  const signSignatureBuffer = Buffer.from(transaction.secondSignature, 'hex');
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  const res = nacl.sign.detached.verify(
    hash,
    signSignatureBuffer,
    publicKeyBuffer
  );

  return res;
}

function verifyBytes(bytes: string, signature: string, publicKey: string) {
  const hash = sha256Bytes(Buffer.from(bytes, 'hex'));
  const signatureBuffer = Buffer.from(signature, 'hex');
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');
  const res = nacl.sign.detached.verify(hash, signatureBuffer, publicKeyBuffer);
  return res;
}

function getKeys(secret: string) {
  const hash = sha256Bytes(Buffer.from(secret));
  const keypair = nacl.sign.keyPair.fromSeed(hash);

  return {
    keypair,
    publicKey: Buffer.from(keypair.publicKey).toString('hex'),
    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
  };
}

function getAddress(publicKey: string) {
  return addressHelper.generateNormalAddress(publicKey);
}

const isAddress = addressHelper.isAddress;
const isBase58CheckAddress = addressHelper.isBase58CheckAddress;

export {
  getBytes,
  getHash,
  getId,
  getFee,
  sign,
  secondSign,
  getKeys,
  getAddress,
  verify,
  verifySecondSignature,
  fixedPoint,
  signBytes,
  toLocalBuffer,
  verifyBytes,
  isAddress,
  isBase58CheckAddress,
};
