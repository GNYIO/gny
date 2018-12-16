import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import BlockReward from '../utils/block-reward';
import * as constants from '../utils/constants';
import { IScope } from '../interfaces';

export class Block {
  private library: IScope;
  private blockReward = new BlockReward();

  constructor(scope: IScope) {
    this.library = scope;
  }

  public getId = (block: any) => {
    const bytes = this.getBytes(block)
    const hash = crypto.createHash('sha256').update(bytes).digest()
    return hash.toString('hex')
  }

  public calculateFee = () => 10000000;

  private sortTransactions(data: any) {
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

  sign(block, keypair) {
    const hash = this.calculateHash(block);
    let privateKey = Buffer.from(keypair.privateKey, 'hex')
    return ed.sign(hash, privateKey).toString('hex');
  }

  private calculateHash(block) {
    let bytes = this.getBytes(block)
    return crypto.createHash('sha256').update(bytes).digest();
  }

  getBytes = (block: any, skipSignature?: any) => {
    const size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64
  
    const bb = new ByteBuffer(size, true)
    bb.writeInt(block.version)
    bb.writeInt(block.timestamp)
    bb.writeLong(block.height)
    bb.writeInt(block.count)
    bb.writeLong(block.fees)
    bb.writeLong(block.reward)
    bb.writeString(block.delegate)
  
    // HARDCODE HOTFIX
    if (block.height > 6167000 && block.prevBlockId) {
      bb.writeString(block.prevBlockId)
    } else {
      bb.writeString('0')
    }
  
    const payloadHashBuffer = Buffer.from(block.payloadHash, 'hex')
    for (let i = 0; i < payloadHashBuffer.length; i++) {
      bb.writeByte(payloadHashBuffer[i])
    }
  
  
    if (!skipSignature && block.signature) {
      const signatureBuffer = Buffer.from(block.signature, 'hex')
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i])
      }
    }
  
    bb.flip()
    const b = bb.toBuffer()
  
    return b
  }


  verifySignature(block) {
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
      throw Error(e.toString());
    }
  }

  objectNormalize(block) {
    for (const i in block) {
      if (block[i] == undefined || typeof block[i] === 'undefined') {
        delete block[i];
      }
      if (Buffer.isBuffer(block[i])) {
        block[i] = block[i].toString();
      }
    }

    const report = this.library.scheme.validate(block, {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        height: {
          type: 'integer',
        },
        signature: {
          type: 'string',
          format: 'signature',
        },
        delegate: {
          type: 'string',
          format: 'publicKey',
        },
        payloadHash: {
          type: 'string',
          format: 'hex',
        },
        payloadLength: {
          type: 'integer',
        },
        prevBlockId: {
          type: 'string',
        },
        timestamp: {
          type: 'integer',
        },
        transactions: {
          type: 'array',
          uniqueItems: true,
        },
        version: {
          type: 'integer',
          minimum: 0,
        },
        reward: {
          type: 'integer',
          minimum: 0,
        },
      },
      required: ['signature', 'delegate', 'payloadHash', 'timestamp', 'transactions', 'version', 'reward'],
    });

    if (!report) {
      throw Error(this.library.scheme.getLastError().toString());
    }

    try {
      for (let i = 0; i < block.transactions.length; i++) {
        block.transactions[i] = this.library.base.transaction.objectNormalize(block.transactions[i]);
      }
    } catch (e) {
      throw Error(e.toString());
    }

    return block;
  }
}