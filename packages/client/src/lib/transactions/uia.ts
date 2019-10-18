import * as transaction from './transaction';
export function registerIssuer(
  name: string,
  desc: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 100,
    fee: String(100 * 1e8),
    args: [name, desc],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export function registerAsset(
  name: string,
  desc: string,
  maximum: string,
  precision: number,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 101,
    fee: String(500 * 1e8),
    args: [name, desc, maximum, precision],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export function issue(
  currency: string,
  amount: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 102,
    fee: String(0.1 * 1e8),
    args: [currency, amount],
    secret: secret,
    secondSecret: secondSecret,
  });
}

export function transfer(
  currency: string,
  amount: string,
  recipientId: string,
  message: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 103,
    fee: String(0.1 * 1e8),
    args: [currency, amount, recipientId],
    secret,
    secondSecret,
    message,
  });
}
