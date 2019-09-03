import { IBlock, KeyPair } from '../../packages/interfaces';
import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../../src/utils/ed';
import joi from '../../src/utils/extendedJoi';
import { copyObject } from './helpers';
import { TransactionBase } from './transaction';

export class BlockBase {
  /***
   * @returns Block Id
   */
  public static getId(old: IBlock) {
    const block = copyObject(old);

    const bytes = BlockBase.getBytes(block);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest();
    return hash.toString('hex');
  }

  /***
   * @returns Block signature
   */
  public static sign(oldBlock: IBlock, oldKeypair: KeyPair): string {
    const block = copyObject(oldBlock);
    const keypair = copyObject(oldKeypair);

    const hash = BlockBase.calculateHash(block);
    return ed.sign(hash, keypair.privateKey).toString('hex');
  }

  /***
   * @returns Block bytes
   */
  public static getBytes(block: IBlock, skipSignature?: any): Buffer {
    const size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64;

    const bb = new ByteBuffer(size, true);
    bb.writeInt(block.version);
    bb.writeInt(block.timestamp);
    bb.writeInt64((block.height as unknown) as number);
    bb.writeInt(block.count);
    bb.writeInt64((block.fees as unknown) as number);
    bb.writeInt64((block.reward as unknown) as number);
    bb.writeString(block.delegate);

    if (block.prevBlockId) {
      bb.writeString(block.prevBlockId);
    } else {
      bb.writeString('0');
    }

    const payloadHashBuffer = Buffer.from(block.payloadHash, 'hex');
    for (let i = 0; i < payloadHashBuffer.length; i++) {
      bb.writeByte(payloadHashBuffer[i]);
    }

    if (!skipSignature && block.signature) {
      const signatureBuffer = Buffer.from(block.signature, 'hex');
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i]);
      }
    }

    bb.flip();
    const b = bb.toBuffer();
    return b;
  }

  public static verifySignature(block: IBlock) {
    const remove = 64;

    try {
      const data = BlockBase.getBytes(block);
      const data2 = Buffer.alloc(data.length - remove);

      for (let i = 0; i < data2.length; i++) {
        data2[i] = data[i];
      }

      const hash = crypto
        .createHash('sha256')
        .update(data2)
        .digest();
      const blockSignatureBuffer = Buffer.from(block.signature, 'hex');
      const generatorPublicKeyBuffer = Buffer.from(block.delegate, 'hex');

      return ed.verify(hash, blockSignatureBuffer, generatorPublicKeyBuffer);
    } catch (e) {
      return false;
    }
  }

  public static normalizeBlock(old: IBlock) {
    const block = copyObject(old);

    for (const i in block) {
      if (block[i] == undefined || typeof block[i] === 'undefined') {
        delete block[i];
      }
      if (Buffer.isBuffer(block[i])) {
        block[i] = block[i].toString();
      }
    }

    const schema = joi.object().keys({
      id: joi.string(),
      height: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      signature: joi
        .string()
        .signature()
        .required(),
      delegate: joi
        .string()
        .publicKey()
        .required(),
      payloadHash: joi
        .string()
        .hex()
        .required(),
      payloadLength: joi
        .number()
        .integer()
        .min(0),
      prevBlockId: joi.string(),
      timestamp: joi
        .number()
        .integer()
        .min(0)
        .required(),
      transactions: joi.array().required(),
      version: joi
        .number()
        .integer()
        .min(0)
        .required(),
      reward: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      fees: joi
        .string()
        .positiveOrZeroBigInt()
        .required(),
      count: joi
        .number()
        .integer()
        .min(0)
        .required(),
    });
    const report = joi.validate(block, schema);
    if (report.error) {
      throw new Error(report.error.message);
    }

    try {
      for (let i = 0; i < block.transactions.length; i++) {
        block.transactions[i] = TransactionBase.normalizeTransaction(
          block.transactions[i]
        );
      }
    } catch (e) {
      throw new Error(e.toString());
    }

    return block;
  }

  public static calculateHash(block: IBlock) {
    const bytes = BlockBase.getBytes(block);
    return crypto
      .createHash('sha256')
      .update(bytes)
      .digest();
  }

  public static calculateFee() {
    return String(10000000);
  }
}
