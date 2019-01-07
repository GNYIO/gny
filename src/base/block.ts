import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import { IScope, KeyPair } from '../interfaces';

export class Block {
  private library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  public getId = (block: any) => {
    const bytes = this.getBytes(block);
    const hash = crypto.createHash('sha256').update(bytes).digest();
    return hash.toString('hex');
  }

  public calculateFee = () => 10000000;

  private sortTransactions = (data: any) => {
    data.transactions.sort((a, b) => {
      if (a.type === b.type) {
        if (a.type === 1) {
          return 1;
        }
        if (b.type === 1) {
          return -1;
        }
        return a.type - b.type;
      }
      if (a.amount !== b.amount) {
        return a.amount - b.amount;
      }
      return a.id.localeCompare(b.id);
    });
  }

  public sign = (block, keypair: KeyPair): string => {
    const hash = this.calculateHash(block);
    return ed.sign(hash, keypair.privateKey).toString('hex');
  }

  private calculateHash = (block) => {
    const bytes = this.getBytes(block);
    return crypto.createHash('sha256').update(bytes).digest();
  }

  private getBytes = (block: any, skipSignature?: any): Buffer => {
    const size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64;

    const bb = new ByteBuffer(size, true);
    bb.writeInt(block.version);
    bb.writeInt(block.timestamp);
    bb.writeInt64(block.height);
    bb.writeInt(block.count);
    bb.writeInt64(block.fees);
    bb.writeInt64(block.reward);
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


  public verifySignature = (block) => {
    const remove = 64;

    try {
      const data = this.getBytes(block);
      const data2 = Buffer.alloc(data.length - remove);

      for (let i = 0; i < data2.length; i++) {
        data2[i] = data[i];
      }

      const hash = crypto.createHash('sha256').update(data2).digest();
      const blockSignatureBuffer = Buffer.from(block.signature, 'hex');
      const generatorPublicKeyBuffer = Buffer.from(block.delegate, 'hex');

      return ed.verify(hash, blockSignatureBuffer || ' ', generatorPublicKeyBuffer || ' ');
    } catch (e) {
      throw new Error(e.toString());
    }
  }

  public objectNormalize = (block) => {
    for (const i in block) {
      if (block[i] == undefined || typeof block[i] === 'undefined') {
        delete block[i];
      }
      if (Buffer.isBuffer(block[i])) {
        block[i] = block[i].toString();
      }
    }

    const schema = this.library.joi.object().keys({
      id: this.library.joi.string(),
      height: this.library.joi.number().integer().min(0),
      signature: this.library.joi.string().signature().required(),
      delegate: this.library.joi.string().publicKey().required(),
      payloadHash: this.library.joi.string().hex().required(),
      payloadLength: this.library.joi.number().integer().min(0),
      prevBlockId: this.library.joi.string(),
      timestamp: this.library.joi.number().integer().min(0).required(),
      transactions: this.library.joi.array().required(),
      version: this.library.joi.number().integer().min(0).required(),
      reward: this.library.joi.number().integer().min(0).required(),
      fees: this.library.joi.number().integer().required(),
      count: this.library.joi.number().integer().min(0).required(),
    });
    const report = this.library.joi.validate(block, schema);
    if (report.error) {
      throw new Error(report.error.message);
    }

    try {
      for (let i = 0; i < block.transactions.length; i++) {
        block.transactions[i] = this.library.base.transaction.objectNormalize(block.transactions[i]);
      }
    } catch (e) {
      throw new Error(e.toString());
    }

    return block;
  }
}