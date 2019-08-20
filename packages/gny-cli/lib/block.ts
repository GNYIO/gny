import * as fs from 'fs';
import * as crypto from 'crypto';

import * as cryptoLib from '../lib/crypto';
import * as accounts from './account';
import * as ByteBuffer from 'bytebuffer';
import { TransactionBase } from '../../../src/base/transaction';

const sender = accounts.account(cryptoLib.generateSecret());

export function getBytes(block, skipSignature?) {
  const size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64;

  const bb = new ByteBuffer(size, true);
  bb.writeInt(block.version);
  bb.writeInt(block.timestamp);
  bb.writeLong(block.height);
  bb.writeInt(block.count);
  bb.writeLong(block.fees);
  bb.writeLong(block.reward);
  bb.writeString(block.delegate);

  if (block.previousBlock) {
    bb.writeString(block.previousBlock);
  } else {
    bb.writeString('0');
  }

  const payloadHashBuffer = new Buffer(block.payloadHash, 'hex');
  for (let i = 0; i < payloadHashBuffer.length; i++) {
    bb.writeByte(payloadHashBuffer[i]);
  }

  if (!skipSignature && block.signature) {
    const signatureBuffer = new Buffer(block.signature, 'hex');
    for (let i = 0; i < signatureBuffer.length; i++) {
      bb.writeByte(signatureBuffer[i]);
    }
  }

  bb.flip();
  const b = bb.toBuffer();

  return b;
}

export function signTransaction(trs, keypair) {
  let bytes = TransactionBase.getBytes(trs);
  trs.signatures.push(cryptoLib.sign(sender.keypair, bytes));
  bytes = TransactionBase.getBytes(trs);
  trs.id = cryptoLib.getId(bytes);
  return trs;
}

export default {
  getBytes: getBytes,
};
