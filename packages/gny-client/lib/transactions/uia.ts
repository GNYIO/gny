import * as transaction from './transaction';
export function registerIssuer(
  name: string,
  desc: string,
  secret: string,
  secondSecret: string
) {
  return transaction.createTransactionEx({
    type: 100,
    fee: 100 * 1e8,
    args: [name, desc],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export function registerAsset(
  name: string,
  desc: string,
  maximum: number,
  precision: number,
  secret: string,
  secondSecret: string
) {
  return transaction.createTransactionEx({
    type: 101,
    fee: 500 * 1e8,
    args: [name, desc, maximum, precision],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export function issue(
  currency: string,
  amount: number,
  secret: string,
  secondSecret: string
) {
  return transaction.createTransactionEx({
    type: 102,
    fee: 0.1 * 1e8,
    args: [currency, amount],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export function transfer(
  currency: string,
  amount: number,
  recipientId: string,
  message: string,
  secret: string,
  secondSecret: string
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
