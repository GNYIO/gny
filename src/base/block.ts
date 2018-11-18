import * as crypto from 'crypto';
import ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import BlockStatus from '../utils/block-status';
import * as constants from '../utils/constants'
import * as addressHelper from '../utils/address';

export class Block {
  private blockStatus = new BlockStatus();
  public scope: any;

  constructor(scope: any) {
    this.scope = scope;
  }

  private sortTransactions(data: any) {
    // 优先级：二级密码，金额
    data.transactions.sort((a, b) => {
      if (a.type === b.type) {
        if (a.type === 1) {
          return 1
        }
        if (b.type === 1) {
          return -1
        }
        return a.type - b.type
      }
      if (a.amount !== b.amount) {
        return a.amount - b.amount
      }
      return a.id.localeCompare(b.id)
    })
  }

  create(data: any) {
    const transactions = this.sortTransactions(data)
    const nextHeight = (data.previousBlock) ? data.previousBlock.height + 1 : 1
    const reward = this.blockStatus.calcReward(nextHeight)

    let totalFee = 0
    let totalAmount = 0
    let size = 0
    let blockTransactions = []
    let payloadHash = crypto.createHash('sha256')
  
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i]
      const bytes = this.scope.transaction.getBytes(transaction)
      // 小于8M
      if (size + bytes.length > constants.maxPayloadLength) {
        break
      }
  
      size += bytes.length
      totalFee += transaction.fee
      totalAmount += transaction.amount
  
      blockTransactions.push(transaction)
      payloadHash.update(bytes)
    }
  
    let block: any = {
      version: 0,
      height: nextHeight,
      timestamp: data.timestamp,
      previousBlockId: data.previousBlock.id,
      generatorPublicKey: data.keypair.publicKey.toString('hex'),
      numberOfTransactions: blockTransactions.length,
      totalAmount,
      totalFee,
      reward,
      payloadHash: payloadHash.digest().toString('hex'),
      payloadLength: size,
      transactions: blockTransactions,
    }
  
    try {
      block.blockSignature = this.sign(block, data.keypair)
      block = this.objectNormalize(block)
    } catch (e) {
      throw Error(e.toString())
    }
  
    return block
  }

  sign(block, keypair) {
    const hash = this.calculateHash(block);
    return ed.Sign(hash, keypair).toString('hex');
  }

  private calculateHash(block) {
    return crypto.createHash('sha256').update(this.serialize(block)).digest();
  }

  serialize(block, skipSignature?) {
    const size = 4 + 4 + 64 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 // 待纠正

    const byteBuffer = new ByteBuffer(size, true)
    byteBuffer.writeInt(block.version) // 4
    byteBuffer.writeLong(block.height) // 
    byteBuffer.writeInt(block.timestamp) // 4
    byteBuffer.writeString(block.prevBlockId) // 64
    byteBuffer.writeInt(block.generatorPublicKey) // 32
    byteBuffer.writeInt(block.numberOfTransactions) // 4
    byteBuffer.writeInt(block.totalAmount) // 8
    byteBuffer.writeInt(block.totalFee) // 8
    byteBuffer.writeLong(block.reward) // 8

    const payloadHashBuffer = Buffer.from(block.payloadHash, 'hex')
    for (let i = 0; i < payloadHashBuffer.length; i++) {
      byteBuffer.writeByte(payloadHashBuffer[i])
    }

    byteBuffer.writeInt(block.payloadLength); // 4

    if (!skipSignature && block.signature) {
      const signatureBuffer = Buffer.from(block.signature, 'hex')
      for (let i = 0; i < signatureBuffer.length; i++) {
        byteBuffer.writeByte(signatureBuffer[i])
      }
    }

    byteBuffer.flip()
    return byteBuffer.toBuffer()
  }

  verifySignature(block) {
    const remove = 64

    try {
      const data = this.serialize(block)
      const data2 = Buffer.alloc(data.length - remove)
  
      for (let i = 0; i < data2.length; i++) {
        data2[i] = data[i]
      }

      const hash = crypto.createHash('sha256').update(data2).digest()
      const blockSignatureBuffer = Buffer.from(block.signature, 'hex')
      const generatorPublicKeyBuffer = Buffer.from(block.delegate, 'hex')
  
      return ed.Verify(hash, blockSignatureBuffer || ' ', generatorPublicKeyBuffer || ' ')
    } catch (e) {
      throw Error(e.toString())
    }
  }

  objectNormalize(block) {
    for (const i in block) {
      if (block[i] == null || typeof block[i] === 'undefined') {
        delete block[i]
      }
      if (Buffer.isBuffer(block[i])) {
        block[i] = block[i].toString()
      }
    }
  
    const report = this.scope.scheme.validate(block, {
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
    })
  
    if (!report) {
      throw Error(this.scope.scheme.getLastError())
    }
  
    try {
      for (let i = 0; i < block.transactions.length; i++) {
        block.transactions[i] = this.scope.transaction.objectNormalize(block.transactions[i])
      }
    } catch (e) {
      throw Error(e.toString())
    }
  
    return block
  }

  calculateFee() {
    return 1000000;
  }

  dbRead(raw) {
    if (!raw.b_id) {
      return null
    }
  
    const block:any = {
      id: raw.b_id,
      version: parseInt(raw.b_version, 10),
      height: parseInt(raw.b_height, 10),
      timestamp: parseInt(raw.b_timestamp, 10),
      previousBlockId: raw.b_previousBlock,
      generatorPublicKey: raw.b_generatorPublicKey,
      numberOfTransactions: parseInt(raw.b_numberOfTransactions, 10),
      totalAmount: parseInt(raw.b_totalAmount, 10),
      totalFee: parseInt(raw.b_totalFee, 10),
      reward: parseInt(raw.b_reward, 10),
      payloadHash: raw.b_payloadHash,
      payloadLength: parseInt(raw.b_payloadLength, 10),
      generatorId: addressHelper.generateNormalAddress(raw.b_generatorPublicKey), // 方法待实现
      blockSignature: raw.b_blockSignature,
      confirmations: raw.b_confirmations,
    }
    block.totalForged = (block.totalFee + block.reward)
    return block
  }
}


