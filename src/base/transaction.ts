import * as crypto from 'crypto';
import ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import * as slots from '../utils/slots';
import * as constants from '../utils/constants';
import * as feeCalculators from '../utils/calculate-fee';
import * as addressUtil from '../utils/address';

export default class Transaction {
  private scope: any;
  constructor(scope: any) {
    this.scope = scope;
  }

  create(data) {
    const transaction: any = {
      type: data.type,
      senderId: addressUtil.generateAddress(data.senderPublicKey),
      senderPublicKey: data.keypair.publicKey.toString('hex'),
      timestamp: slots.getTime(),
      message: data.message,
      args: data.args,
      fee: data.fee,
      mode: data.mode,
    };

    transaction.signatures = [this.sign(data.keypair, transaction)];

    if (data.secondKeypair) {
      transaction.secondSignature = this.sign(data.secondKeypair, transaction);
    }

    transaction.id = this.getHash(transaction).toString('hex');

    return transaction;
  }

  sign(keypair, transaction) {
    const hash = crypto.createHash('sha256').update(this.getBytes(transaction, true, true)).digest();
    return ed.sign(hash, keypair).toString('hex');
  }

  getHash(transaction) {
    return crypto.createHash('sha256').update(this.getBytes(transaction)).digest();
  }

  getBytes(transaction, skipSignature, skipSecondSignature) {
    const byteBuffer = new ByteBuffer(1, true);
    byteBuffer.writeInt(transaction.type);
    byteBuffer.writeInt(transaction.timestamp);
    byteBuffer.writeLong(transaction.fee);
    byteBuffer.writeString(transaction.senderId);
    if (transaction.requestorId) {
      byteBuffer.writeString(transaction.requestorId);
    }
    if (transaction.mode) {
      byteBuffer.writeInt(transaction.mode);
    }

    if (transaction.message) byteBuffer.writeString(transaction.message);
    if (transaction.args) {
      let args;
      if (typeof transaction.args === 'string') {
        args = transaction.args;
      } else if (Array.isArray(transaction.args)) {
        args = JSON.stringify(transaction.args);
      } else {
        throw new Error('Invalid transaction args');
      }
      byteBuffer.writeString(args);
    }

    // FIXME
    if (!skipSignature && transaction.signatures) {
      for (const signature of transaction.signatures) {
        const signatureBuffer = Buffer.from(signature, 'hex');
        for (let i = 0; i < signatureBuffer.length; i++) {
          byteBuffer.writeByte(signatureBuffer[i]);
        }
      }
    }

    if (!skipSecondSignature && transaction.secondSignature) {
      const secondSignatureBuffer = Buffer.from(transaction.secondSignature, 'hex');
      for (let i = 0; i < secondSignatureBuffer.length; i++) {
        byteBuffer.writeByte(secondSignatureBuffer[i]);
      }
    }

    byteBuffer.flip();

    return byteBuffer.toBuffer();
  }

  verifyNormalSignature(transaction, requestor, bytes) {
    if (!this.verifyBytes(bytes, transaction.senderPublicKey, transaction.signatures[0])) {
      return 'Invalid signature';
    }
    if (requestor.secondPublicKey) {
      if (!transaction.secondSignature) return 'Second signature not provided';
      if (!this.verifyBytes(bytes, requestor.secondPublicKey, transaction.secondSignature)) {
        return 'Invalid second signature';
      }
    }
    return undefined;
  }

  async verify(context) {
    const { transaction, sender, requestor } = context;
    if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
      return 'Invalid transaction timestamp';
    }

    if (!transaction.type) {
      return 'Invalid function';
    }

    const feeCalculator = feeCalculators[transaction.type];
    if (!feeCalculator) return 'Fee calculator not found';
    const minFee = 100000000 * feeCalculator(transaction);
    if (transaction.fee < minFee) return 'Fee not enough';

    try {
      const bytes = this.getBytes(transaction, true, true);
      if (transaction.senderPublicKey) {
        const error = this.verifyNormalSignature(transaction, requestor, bytes);
        if (error) return error;
      } else if (!transaction.senderPublicKey && transaction.signatures && transaction.signatures.length > 1) {
        const ADDRESS_TYPE = app.util.address.TYPE;
        const addrType = app.util.address.getType(transaction.senderId);
        if (addrType === ADDRESS_TYPE.CHAIN) {
          const error = await this.verifyChainSignature(transaction, sender, bytes);
          if (error) return error;
        } else if (addrType === ADDRESS_TYPE.GROUP) {
          const error = await this.verifyGroupSignature(transaction, sender, bytes);
          if (error) return error;
        } else {
          return 'Invalid account type';
        }
      } else {
        return 'Faied to verify signature';
      }
    } catch (e) {
      library.logger.error('verify signature excpetion', e);
      return 'Faied to verify signature';
    }
    return undefined;
  }

  verifySignature(transaction, publicKey, signature) {
    if (!signature) return false;

    try {
      const bytes = this.getBytes(transaction, true, true);
      return this.verifyBytes(bytes, publicKey, signature);
    } catch (e) {
      throw Error(e.toString());
    }
  }

  verifyBytes(bytes, publicKey, signature) {
    try {
      const data2 = Buffer.alloc(bytes.length);

      for (let i = 0; i < data2.length; i++) {
        data2[i] = bytes[i];
      }

      const hash = crypto.createHash('sha256').update(data2).digest();
      const signatureBuffer = Buffer.from(signature, 'hex');
      const publicKeyBuffer = Buffer.from(publicKey, 'hex');
      return ed.Verify(hash, signatureBuffer || ' ', publicKeyBuffer || ' ');
    } catch (e) {
      throw Error(e.toString());
    }
  }

  async apply(context: any) {
    const {
      block, transaction, sender, requestor,
    } = context;
    const name = app.getContractName(transaction.type);
    if (!name) {
      throw new Error(`Unsupported transaction type: ${transaction.type}`);
    }
    const [mod, func] = name.split('.');
    if (!mod || !func) {
      throw new Error('Invalid transaction function');
    }
    const fn = app.contract[mod][func];
    if (!fn) {
      throw new Error('Contract not found');
    }

    if (block.height !== 0) {
      if (transactionMode.isRequestMode(transaction.mode) && !context.activating) {
        const requestorFee = 20000000;
        if (requestor.xas < requestorFee) throw new Error('Insufficient requestor balance');
        requestor.xas -= requestorFee;
        app.addRoundFee(requestorFee, modules.round.calc(block.height));
        // transaction.executed = 0
        app.sdb.create('TransactionStatu', { tid: transaction.id, executed: 0 });
        app.sdb.update('Account', { xas: requestor.xas }, { address: requestor.address });
        return;
      }
      if (sender.xas < transaction.fee) throw new Error('Insufficient sender balance');
      sender.xas -= transaction.fee;
      app.sdb.update('Account', { xas: sender.xas }, { address: sender.address });
    }

    const error = await fn.apply(context, transaction.args);
    if (error) {
      throw new Error(error);
    }
    // transaction.executed = 1
  }

  objectNormalize(transaction) {
    for (const i in transaction) {
      if (transaction[i] === null || typeof transaction[i] === 'undefined') {
        delete transaction[i];
      }
      if (Buffer.isBuffer(transaction[i])) {
        transaction[i] = transaction[i].toString();
      }
    }

    if (transaction.args && typeof transaction.args === 'string') {
      try {
        transaction.args = JSON.parse(transaction.args);
        if (!Array.isArray(transaction.args)) throw new Error('Transaction args must be json array');
      } catch (e) {
        throw new Error(`Failed to parse args: ${e}`);
      }
    }

    if (transaction.signatures && typeof transaction.signatures === 'string') {
      try {
        transaction.signatures = JSON.parse(transaction.signatures);
      } catch (e) {
        throw new Error(`Failed to parse signatures: ${e}`);
      }
    }

    // FIXME
    const report = this.scope.scheme.validate(transaction, {
      type: 'object',
      properties: {
        id: { type: 'string' },
        height: { type: 'integer' },
        type: { type: 'integer' },
        timestamp: { type: 'integer' },
        senderId: { type: 'string' },
        fee: { type: 'integer', minimum: 0, maximum: constants.totalAmount },
        secondSignature: { type: 'string', format: 'signature' },
        signatures: { type: 'array' },
        // args: { type: "array" },
        message: { type: 'string', maxLength: 256 },
      },
      required: ['type', 'timestamp', 'senderId', 'signatures'],
    });

    if (!report) {
      library.logger.error(`Failed to normalize transaction body: ${this.scope.scheme.getLastError().details[0].message}`, transaction);
      throw Error(this.scope.scheme.getLastError());
    }

    return transaction;
  }
}