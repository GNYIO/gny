import {
  IBlock,
  IBlockWithoutSignatureId,
  IBlockWithoutId,
  NaclKeyPair,
} from '@gny/interfaces';
import * as webEd from '@gny/web-ed';
import * as ByteBuffer from 'bytebuffer';
import { copyObject } from './helpers';
import * as crypto from 'crypto';

export class BlockWebBase {
  public static getId(old: IBlockWithoutSignatureId) {
    const block = copyObject(old);

    const bytes = BlockWebBase.getBytes(block);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest();
    return hash.toString('hex');
  }

  public static getBytes(block: IBlockWithoutSignatureId): Buffer;
  public static getBytes(
    block: IBlockWithoutSignatureId,
    skipSignature: false
  ): Buffer;
  public static getBytes(block: IBlockWithoutId, skipSignature: true): Buffer;
  public static getBytes(block: IBlock, skipSignature?: boolean): Buffer {
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

  public static sign(
    oldBlock: IBlockWithoutSignatureId,
    oldKeypair: NaclKeyPair
  ): string {
    const block = copyObject(oldBlock);
    const keypair = copyObject(oldKeypair);

    const hash = BlockWebBase.calculateHash(block);
    return Buffer.from(webEd.sign(hash, keypair.secretKey)).toString('hex');
  }

  public static calculateHash(block: IBlockWithoutSignatureId): Buffer;
  public static calculateHash(block: IBlock) {
    const bytes = BlockWebBase.getBytes(block);
    return crypto
      .createHash('sha256')
      .update(bytes)
      .digest();
  }
}
