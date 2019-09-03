import * as crypto from './crypto';
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
    fee: 0.1 * 1e8,
    args: [amount, recipientId],
    secret,
    secondSecret: secondSecret,
    message,
  });
}

function setUserName(username: string, secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 1,
    fee: 5 * 1e8,
    secret: secret,
    secondSecret: secondSecret,
    args: [username],
  });
}

function newSignature(secondSecret: string) {
  const keys = crypto.getKeys(secondSecret);
  const signature = {
    publicKey: keys.publicKey,
  };
  return signature;
}

function setSecondPassphrase(secret: string, secondSecret: string) {
  const secondSignature = newSignature(secondSecret);
  return transaction.createTransactionEx({
    type: 2,
    fee: 5 * 1e8,
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
    fee: 0.1 * 1e8,
    args: [height, amount],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function unlock(secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 6,
    fee: 0,
    args: [],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function vote(keyList: string[], secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 4,
    fee: 0.1 * 1e8,
    args: keyList,
    secret: secret,
    secondSecret: secondSecret,
  });
}

function unvote(keyList: string[], secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 5,
    fee: 0.1 * 1e8,
    args: keyList,
    secret: secret,
    secondSecret: secondSecret,
  });
}

function registerDelegate(secret: string, secondSecret?: string) {
  return transaction.createTransactionEx({
    type: 10,
    fee: 100 * 1e8,
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
