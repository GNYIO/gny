var crypto = require('./crypto.js');
var transaction = require('./transaction.js');

function transfer(recipientId, amount, message, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 0,
    fee: 0.1 * 1e8,
    args: [amount, recipientId],
    secret,
    secondSecret: secondSecret,
    message,
  });
}

function setUserName(username, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 1,
    fee: 5 * 1e8,
    secret: secret,
    secondSecret: secondSecret,
    args: [username],
  });
}

function newSignature(secondSecret) {
  var keys = crypto.getKeys(secondSecret);
  var signature = {
    publicKey: keys.publicKey,
  };
  return signature;
}

function setSecondPassphrase(secret, secondSecret) {
  var secondSignature = newSignature(secondSecret);
  return transaction.createTransactionEx({
    type: 2,
    fee: 5 * 1e8,
    args: [secondSignature.publicKey],
    secret: secret,
  });
}

function lock(height, amount, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 3,
    fee: 0.1 * 1e8,
    args: [height, amount],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function unlock(secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 6,
    fee: 0,
    args: [],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function vote(keyList, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 4,
    fee: 0.1 * 1e8,
    args: keyList,
    secret: secret,
    secondSecret: secondSecret,
  });
}

function unvote(keyList, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 5,
    fee: 0.1 * 1e8,
    args: keyList,
    secret: secret,
    secondSecret: secondSecret,
  });
}

function registerDelegate(secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 10,
    fee: 100 * 1e8,
    args: [],
    secret: secret,
    secondSecret: secondSecret,
  });
}

module.exports = {
  transfer: transfer,
  setUserName: setUserName,
  setSecondPassphrase: setSecondPassphrase,
  lock: lock,
  unlock: unlock,
  vote: vote,
  unvote: unvote,
  registerDelegate: registerDelegate,
};
