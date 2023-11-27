import * as transaction from './transaction';

function registerDatMaker(
  name: string,
  desc: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 300,
    fee: String(100 * 1e8),
    args: [name, desc],
    secret,
    secondSecret: secondSecret,
  });
}

function createDat(
  datName: string,
  hash: string,
  makerId: string,
  url: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 301,
    fee: String(0.1 * 1e8),
    args: [datName, hash, makerId, url],
    secret,
    secondSecret: secondSecret,
  });
}

export { registerDatMaker, createDat };
