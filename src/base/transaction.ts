import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import slots from '../utils/slots';
// import * as constants from '../utils/constants';
import * as addressHelper from '../utils/address';
import feeCalculators from '../utils/calculate-fee';
import { IScope, KeyPair, IBlock } from '../interfaces';

import { Transaction as ITransaction } from '../interfaces';

interface Context {
  trs: ITransaction;
  block: Pick<IBlock, 'height'>;
  sender: any;
}

export class Transaction {
  private readonly library: IScope;
  constructor(scope: IScope) {
    this.library = scope;
  }

  public create = data => {
    const transaction = {
      type: data.type,
      senderId: addressHelper.generateAddress(
        data.keypair.publicKey.toString('hex')
      ),
      senderPublicKey: data.keypair.publicKey.toString('hex'),
      timestamp: slots.getTime(undefined),
      message: data.message,
      args: data.args,
      fee: data.fee,
    } as ITransaction;

    transaction.signatures = [this.sign(data.keypair, transaction)];

    if (data.secondKeypair) {
      transaction.secondSignature = this.sign(data.secondKeypair, transaction);
    }

    transaction.id = this.getHash(transaction).toString('hex');

    return transaction;
  };

  private sign = (keypair: KeyPair, transaction) => {
    const bytes = this.getBytes(transaction, true, true);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest();

    return ed.sign(hash, keypair.privateKey).toString('hex');
  };

  getId(transaction) {
    return this.getHash(transaction).toString('hex');
  }

  private getHash(transaction) {
    return crypto
      .createHash('sha256')
      .update(this.getBytes(transaction))
      .digest();
  }

  public getBytes(transaction, skipSignature?, skipSecondSignature?): Buffer {
    const byteBuffer = new ByteBuffer(1, true);
    byteBuffer.writeInt(transaction.type);
    byteBuffer.writeInt(transaction.timestamp);
    byteBuffer.writeInt64(transaction.fee);
    byteBuffer.writeString(transaction.senderId);

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
      const secondSignatureBuffer = Buffer.from(
        transaction.secondSignature,
        'hex'
      );
      for (let i = 0; i < secondSignatureBuffer.length; i++) {
        byteBuffer.writeByte(secondSignatureBuffer[i]);
      }
    }

    byteBuffer.flip();

    return byteBuffer.toBuffer();
  }

  verifyNormalSignature(transaction, sender, bytes) {
    if (
      !this.verifyBytes(
        bytes,
        transaction.senderPublicKey,
        transaction.signatures[0]
      )
    ) {
      return 'Invalid signature';
    }
    if (sender.secondPublicKey) {
      if (!transaction.secondSignature) return 'Second signature not provided';
      if (
        !this.verifyBytes(
          bytes,
          sender.secondPublicKey,
          transaction.secondSignature
        )
      ) {
        return 'Invalid second signature';
      }
    }
    return undefined;
  }

  async verify(context) {
    const { trs, sender } = context;
    if (slots.getSlotNumber(trs.timestamp) > slots.getSlotNumber()) {
      return 'Invalid transaction timestamp';
    }

    if (trs.type === undefined || trs.type === null) {
      return 'Invalid function';
    }

    const feeCalculator = feeCalculators[trs.type];
    if (!feeCalculator) return 'Fee calculator not found';
    const minFee = 100000000 * feeCalculator(trs);
    if (trs.fee < minFee) return 'Fee not enough';

    try {
      const bytes = this.getBytes(trs, true, true);
      if (trs.senderPublicKey) {
        const error = this.verifyNormalSignature(trs, sender, bytes);
        if (error) return error;
      } else {
        return 'Failed to verify signature';
      }
    } catch (e) {
      this.library.logger.error('verify signature excpetion', e);
      return 'Failed to verify signature';
    }
    return undefined;
  }

  verifyBytes(bytes, publicKey, signature) {
    try {
      const data2 = Buffer.alloc(bytes.length);

      for (let i = 0; i < data2.length; i++) {
        data2[i] = bytes[i];
      }

      const hash = crypto
        .createHash('sha256')
        .update(data2)
        .digest();
      const signatureBuffer = Buffer.from(signature, 'hex');
      const publicKeyBuffer = Buffer.from(publicKey, 'hex');
      return ed.verify(hash, signatureBuffer || ' ', publicKeyBuffer || ' ');
    } catch (e) {
      throw new Error(e.toString());
    }
  }

  async apply(context: Context) {
    const { block, trs, sender } = context;
    const name = global.app.getContractName(String(trs.type));
    if (!name) {
      throw new Error(`Unsupported transaction type: ${trs.type}`);
    }
    const [mod, func] = name.split('.');
    if (!mod || !func) {
      throw new Error('Invalid transaction function');
    }
    const fn = global.app.contract[mod][func];
    if (!fn) {
      throw new Error('Contract not found');
    }

    if (block.height !== 0) {
      if (sender.gny < trs.fee) throw new Error('Insufficient sender balance');
      sender.gny -= trs.fee;
      await global.app.sdb.update(
        'Account',
        { gny: sender.gny },
        { address: sender.address }
      );
    }

    const error = await fn.apply(context, trs.args);
    if (error) {
      throw new Error(error);
    }
    // transaction.executed = 1
    return null;
  }

  public objectNormalize = transaction => {
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
        if (!Array.isArray(transaction.args))
          throw new Error('Transaction args must be json array');
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

    const signedTransactionSchema = this.library.joi.object().keys({
      fee: this.library.joi
        .number()
        .integer()
        .min(0)
        .required(),
      type: this.library.joi
        .number()
        .integer()
        .min(0)
        .required(),
      timestamp: this.library.joi
        .number()
        .integer()
        .min(0)
        .required(),
      args: this.library.joi.array().optional(),
      message: this.library.joi
        .string()
        .max(256)
        .allow('')
        .optional(),
      senderId: this.library.joi
        .string()
        .address()
        .required(),
      senderPublicKey: this.library.joi
        .string()
        .publicKey()
        .required(),
      signatures: this.library.joi
        .array()
        .length(1)
        .items(
          this.library.joi
            .string()
            .signature()
            .required()
        )
        .required()
        .single(),
      secondSignature: this.library.joi
        .string()
        .signature()
        .optional(),
      id: this.library.joi
        .string()
        .hex()
        .required(),
      height: this.library.joi
        .number()
        .integer()
        .optional(),
    });
    const report = this.library.joi.validate(
      transaction,
      signedTransactionSchema
    );
    if (report.error) {
      this.library.logger.error(
        `Failed to normalize transaction body: ${report.error.message}`,
        transaction
      );
      throw new Error(report.error.message);
    }

    return transaction;
  };
}
