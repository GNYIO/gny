import * as transaction from './transaction';

function registerNftMaker(
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

function createNft(
  nftName: string,
  hash: string,
  makerId: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 301,
    fee: String(0.1 * 1e8),
    args: [nftName, hash, makerId],
    secret,
    secondSecret: secondSecret,
  });
}

export { registerNftMaker, createNft };
