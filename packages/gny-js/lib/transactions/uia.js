var transaction = require('./transaction');

function registerIssuer(name, desc, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 100,
    fee: 100 * 1e8,
    args: [name, desc],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function registerAsset(name, desc, maximum, precision, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 101,
    fee: 500 * 1e8,
    args: [name, desc, maximum, precision],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function issue(currency, amount, secret, secondSecret) {
  return transaction.createTransactionEx({
    type: 102,
    fee: 0.1 * 1e8,
    args: [currency, amount],
    secret: secret,
    secondSecret: secondSecret,
  });
}

function transfer(
  currency,
  amount,
  recipientId,
  message,
  secret,
  secondSecret
) {
  return transaction.createTransactionEx({
    type: 103,
    fee: 0.1 * 1e8,
    args: [currency, amount, recipientId],
    secret,
    secondSecret,
    message,
  });
}

module.exports = {
  registerIssuer,
  registerAsset,
  issue,
  transfer,
};
