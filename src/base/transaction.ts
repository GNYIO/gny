import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import { KeyPair } from '../interfaces';
import { copyObject } from './helpers';
import { Transaction, Context } from '../../src/interfaces';
import slots from '../../src/utils/slots';
import feeCalculators from '../../src/utils/calculate-fee';
import * as addressHelper from '../../src/utils/address';
import joi from '../../src/utils/extendedJoi';

export class TransactionBase {
  public static normalizeTransaction(old: any) {
    const transaction = copyObject(old);

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

    const signedTransactionSchema = joi.object().keys({
      fee: joi
        .number()
        .integer()
        .min(0)
        .required(),
      type: joi
        .number()
        .integer()
        .min(0)
        .required(),
      timestamp: joi
        .number()
        .integer()
        .min(0)
        .required(),
      args: joi.array().optional(),
      message: joi
        .string()
        .max(256)
        .alphanum()
        .allow('')
        .optional(),
      senderId: joi
        .string()
        .address()
        .required(),
      senderPublicKey: joi
        .string()
        .publicKey()
        .required(),
      signatures: joi
        .array()
        .length(1)
        .items(
          joi
            .string()
            .signature()
            .required()
        )
        .required()
        .single(),
      secondSignature: joi
        .string()
        .signature()
        .optional(),
      id: joi
        .string()
        .hex()
        .required(),
      height: joi
        .number()
        .integer()
        .optional(),
    });
    const report = joi.validate(transaction, signedTransactionSchema);
    if (report.error) {
      throw new Error(report.error.message);
    }

    return transaction;
  }

  public static verifyBytes(
    bytes: Buffer,
    publicKey: string,
    signature: string
  ) {
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
      return ed.verify(hash, signatureBuffer, publicKeyBuffer);
    } catch (e) {
      throw new Error(e.toString());
    }
  }

  public static verifyNormalSignature(
    transaction: Transaction,
    sender,
    bytes: Buffer
  ) {
    if (
      !TransactionBase.verifyBytes(
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
        !TransactionBase.verifyBytes(
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

  public static async verify(context: Pick<Context, 'trs' | 'sender'>) {
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
      const bytes = TransactionBase.getBytes(trs, true, true);
      if (trs.senderPublicKey) {
        const error = TransactionBase.verifyNormalSignature(trs, sender, bytes);
        if (error) return error;
      } else {
        return 'Failed to verify signature';
      }
    } catch (e) {
      return 'Failed to verify signature';
    }
    return undefined;
  }

  public static create(data) {
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
    } as Transaction;

    transaction.signatures = [TransactionBase.sign(data.keypair, transaction)];

    if (data.secondKeypair) {
      transaction.secondSignature = TransactionBase.sign(
        data.secondKeypair,
        transaction
      );
    }

    transaction.id = TransactionBase.getHash(transaction).toString('hex');

    return transaction;
  }

  private static sign(keypair: KeyPair, transaction) {
    const bytes = TransactionBase.getBytes(transaction, true, true);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest();

    return ed.sign(hash, keypair.privateKey).toString('hex');
  }

  public static getId(transaction) {
    return TransactionBase.getHash(transaction).toString('hex');
  }

  private static getHash(transaction) {
    return crypto
      .createHash('sha256')
      .update(TransactionBase.getBytes(transaction))
      .digest();
  }

  public static getBytes(
    transaction,
    skipSignature?,
    skipSecondSignature?
  ): Buffer {
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
}
