import * as webBase from '@gny/web-base';
import * as transaction from './transaction';

function transfer(
  recipientId: string,
  amount: string,
  message: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 0,
    fee: String(0.1 * 1e8),
    args: [amount, recipientId],
    secret,
    secondSecret: secondSecret,
    message,
  });
}

function setUserName(username: string, secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 1,
    fee: String(5 * 1e8),
    secret: secret,
    secondSecret: secondSecret,
    args: [username],
  });
}

function newSignature(secondSecret: string) {
  const keys = webBase.getKeys(secondSecret);
  const signature = {
    publicKey: keys.publicKey,
  };
  return signature;
}

function setSecondPassphrase(secret: string, secondSecret: string) {
  const secondSignature = newSignature(secondSecret);
  return transaction.createTransactionEx({
    type: 2,
    fee: String(5 * 1e8),
    args: [secondSignature.publicKey],
    secret: secret,
  });
}

function lock(
  height: number,
  amount: number,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 3,
    fee: String(0.1 * 1e8),
    args: [height, amount],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function unlock(secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 6,
    fee: String(0),
    args: [],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function vote(keyList: string[], secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 4,
    fee: String(0.1 * 1e8),
    args: [keyList.join(',')],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function unvote(keyList: string[], secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 5,
    fee: String(0.1 * 1e8),
    args: [keyList.join(',')],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function registerDelegate(secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 10,
    fee: String(100 * 1e8),
    args: [],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export {
  transfer,
  setUserName,
  setSecondPassphrase,
  lock,
  unlock,
  vote,
  unvote,
  registerDelegate,
};
