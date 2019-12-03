import {
  NaclKeyPair,
  ITransaction,
  UnconfirmedTransaction,
} from '@gny/interfaces';
import * as addressHelper from '@gny/utils';
import { slots } from '@gny/utils';
import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as webEd from '@gny/web-ed';

function toHex(uint8Array: Uint8Array) {
  return Buffer.from(uint8Array).toString('hex');
}

export interface CreateTransactionTypeWeb {
  type: number;
  keypair: NaclKeyPair;
  message?: string;
  args: any;
  fee: string;
  secondKeypair?: NaclKeyPair;
}

export class TransactionWebBase {
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
      return webEd.verify(hash, signatureBuffer, publicKeyBuffer);
    } catch (e) {
      return false;
    }
  }

  static create(data: CreateTransactionTypeWeb) {
    const transaction: Omit<
      ITransaction,
      'id' | 'signatures' | 'secondSignature' | 'height'
    > = {
      type: data.type,
      senderId: addressHelper.generateAddress(toHex(data.keypair.publicKey)),
      senderPublicKey: toHex(data.keypair.publicKey),
      timestamp: slots.getEpochTime(),
      message: data.message,
      args: data.args,
      fee: data.fee,
    };

    const intermediate: Omit<ITransaction, 'id' | 'height'> = {
      ...transaction,
      signatures: [TransactionWebBase.sign(data.keypair, transaction)],
    };

    if (data.secondKeypair) {
      intermediate.secondSignature = TransactionWebBase.sign(
        data.secondKeypair,
        intermediate
      );
    }

    const final: UnconfirmedTransaction = {
      ...intermediate,
      id: TransactionWebBase.getHash(intermediate).toString('hex'),
    };

    return final;
  }

  public static sign(
    keypair: NaclKeyPair,
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
    const bytes = TransactionWebBase.getBytes(transaction, true, true);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest();

    return toHex(webEd.sign(hash, keypair.secretKey));
  }

  public static getId(transaction: ITransaction | UnconfirmedTransaction) {
    return TransactionWebBase.getHash(transaction).toString('hex');
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
      .update(TransactionWebBase.getBytes(transaction))
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
}
