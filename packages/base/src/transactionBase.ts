import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '@gny/ed';
import { KeyPair, IAccount, UnconfirmedTransaction } from '@gny/interfaces';
import { copyObject } from './helpers';
import { ITransaction, Context } from '@gny/interfaces';
import { slots } from '@gny/utils';
import { feeCalculators } from '@gny/utils';
import * as addressHelper from '@gny/utils';
import BigNumber from 'bignumber.js';
import {
  isTransaction,
  isGenesisTransaction,
  isUnconfirmedTransaction,
} from '@gny/type-validation';

export interface CreateTransactionType {
  type: number;
  keypair: KeyPair;
  message?: string;
  args: any;
  fee: string;
  secondKeypair?: KeyPair;
}

export class TransactionBase {
  public static normalizeTransaction(transaction: ITransaction) {
    transaction = TransactionBase.cleanTransaction(transaction);

    if (isTransaction(transaction)) {
      return transaction;
    }

    throw new Error('is not a valid transaction');
  }

  public static normalizeGenesisTransaction(transaction: ITransaction) {
    transaction = TransactionBase.cleanTransaction(transaction);

    if (isGenesisTransaction(transaction)) {
      return transaction;
    }

    throw new Error('is not a valid transaction');
  }

  public static normalizeUnconfirmedTransaction(
    transaction: UnconfirmedTransaction
  ) {
    transaction = TransactionBase.cleanTransaction(transaction);

    if (isUnconfirmedTransaction(transaction)) {
      return transaction;
    }

    throw new Error('is not a valid unconfirmedTransaction');
  }

  private static cleanTransaction(old: any) {
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
      return false;
    }
  }

  public static verifyNormalSignature(
    transaction: Pick<
      ITransaction,
      'senderPublicKey' | 'signatures' | 'secondSignature'
    >,
    sender: IAccount,
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
    if (transaction.secondSignature && !sender.secondPublicKey) {
      return 'Second password was not registered';
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
    const minFee = 100000000 * feeCalculator();
    if (new BigNumber(trs.fee).lt(minFee)) return 'Fee not enough';

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

  public static create(data: CreateTransactionType) {
    const transaction: Omit<
      ITransaction,
      'id' | 'signatures' | 'secondSignature' | 'height'
    > = {
      type: data.type,
      senderId: addressHelper.generateAddress(
        data.keypair.publicKey.toString('hex')
      ),
      senderPublicKey: data.keypair.publicKey.toString('hex'),
      timestamp: slots.getEpochTime(),
      message: data.message,
      args: data.args,
      fee: data.fee,
    };

    const intermediate: Omit<ITransaction, 'id' | 'height'> = {
      ...transaction,
      signatures: [TransactionBase.sign(data.keypair, transaction)],
      secondSignature: undefined,
    };

    if (data.secondKeypair) {
      intermediate.secondSignature = TransactionBase.sign(
        data.secondKeypair,
        intermediate
      );
    }

    const final: UnconfirmedTransaction = {
      ...intermediate,
      id: TransactionBase.getHash(intermediate).toString('hex'),
    };

    return final;
  }

  public static sign(
    keypair: KeyPair,
    transaction: Pick<
      ITransaction,
      | 'type'
      | 'timestamp'
      | 'fee'
      | 'senderId'
      | 'message'
      | 'args'
      | 'signatures'
      | 'secondSignature'
    >
  ) {
    const bytes = TransactionBase.getBytes(transaction, true, true);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest();

    return ed.sign(hash, keypair.privateKey).toString('hex');
  }

  public static getId(transaction: ITransaction | UnconfirmedTransaction) {
    return TransactionBase.getHash(transaction).toString('hex');
  }

  public static getHash(
    transaction: Pick<
      ITransaction,
      | 'type'
      | 'timestamp'
      | 'fee'
      | 'senderId'
      | 'message'
      | 'args'
      | 'signatures'
      | 'secondSignature'
    >
  ) {
    return crypto
      .createHash('sha256')
      .update(TransactionBase.getBytes(transaction))
      .digest();
  }

  public static getBytes(
    transaction: Pick<
      ITransaction,
      | 'type'
      | 'timestamp'
      | 'fee'
      | 'senderId'
      | 'message'
      | 'args'
      | 'signatures'
      | 'secondSignature'
    >,
    skipSignature?: boolean,
    skipSecondSignature?: boolean
  ): Buffer {
    const byteBuffer = new ByteBuffer(1, true);
    byteBuffer.writeInt(transaction.type);
    byteBuffer.writeInt(transaction.timestamp);
    byteBuffer.writeInt64((transaction.fee as unknown) as number);
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

  public static turnIntoFullTransaction(
    unconfirmed: UnconfirmedTransaction,
    height: string
  ) {
    const trs: ITransaction = {
      ...unconfirmed,
      height: height,
    };
    return trs;
  }

  public static stringifySignatureAndArgs(transaction: ITransaction) {
    return {
      ...transaction,
      signatures: JSON.stringify(transaction.signatures),
      args: JSON.stringify(transaction.args),
    } as ITransaction;
  }
}
