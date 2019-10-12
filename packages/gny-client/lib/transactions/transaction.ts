import crypto = require('./crypto');
import { slots } from '@gny/utils';
import options = require('../options');
import { ITransaction } from '@gny/interfaces';

export function createTransactionEx(params: any) {
  if (!params.secret) throw new Error('Secret needed');
  const keys = crypto.getKeys(params.secret);
  const transaction: any = {
    type: params.type,
    timestamp: slots.getTime(),
    fee: String(params.fee),
    message: params.message,
    args: params.args,
    senderPublicKey: keys.publicKey,
    senderId: crypto.getAddress(keys.publicKey),
    signatures: [],
  };
  transaction.signatures.push(crypto.sign(transaction, keys));
  if (params.secondSecret) {
    const secondKeys = crypto.getKeys(params.secondSecret);
    transaction.secondSignature = crypto.secondSign(transaction, secondKeys);
  }
  transaction.id = crypto.getId(transaction);
  return transaction as ITransaction;
}

export function createMultiSigTransaction(params: any) {
  const transaction = {
    type: params.type,
    fee: params.fee,
    senderId: params.senderId,
    requestId: params.requestId,
    mode: params.mode,
    timestamp: slots.getTime() - options.get('clientDriftSeconds'),
    args: params.args,
  };
  return transaction;
}

export function signMultiSigTransaction(transaction: any, secret: string) {
  const keys = crypto.getKeys(secret);
  const signature = crypto.sign(transaction, keys);

  return keys.publicKey + signature;
}
