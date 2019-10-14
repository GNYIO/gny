// import crypto = require('./crypto');
import * as crypto from './crypto';
import { slots } from '@gny/utils';
import { ITransaction } from '@gny/interfaces';

interface Params {
  type: number;
  fee: number;
  args: (string | number)[];
  secret: string;
  message?: string;
  secondSecret?: string;
}
export function createTransactionEx(params: Params) {
  if (!params.secret) throw new Error('Secret needed');
  const keys = crypto.getKeys(params.secret);
  const transaction = {
    type: params.type,
    timestamp: slots.getTime(undefined),
    fee: String(params.fee),
    message: params.message,
    args: params.args,
    senderPublicKey: keys.publicKey,
    senderId: crypto.getAddress(keys.publicKey),
    signatures: [],
  } as ITransaction;
  transaction.signatures.push(crypto.sign(transaction, keys));
  if (params.secondSecret) {
    const secondKeys = crypto.getKeys(params.secondSecret);
    transaction.secondSignature = crypto.secondSign(transaction, secondKeys);
  }
  transaction.id = crypto.getId(transaction);
  return transaction as ITransaction;
}
