import * as crypto from 'crypto';
import * as ByteBuffer from 'bytebuffer';
import * as ed from '../utils/ed';
import slots from '../utils/slots';
// import * as constants from '../utils/constants';
import { IScope, KeyPair, IBlock, Context } from '../interfaces';

import { Transaction as ITransaction } from '../interfaces';

export class Transaction {
  private readonly library: IScope;
  constructor(scope: IScope) {
    this.library = scope;
  }

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
}
