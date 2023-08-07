import * as transaction from './transaction';

function registerNftMaker(
  name: string,
  desc: string,
  message: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 300,
    fee: String(100 * 1e8),
    args: [name, desc],
    secret,
    secondSecret: secondSecret,
    message,
  });
}

function createNft(
  nftName: string,
  cid: string,
  makerId: string,
  message: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 301,
    fee: String(0.1 * 1e8),
    args: [nftName, cid, makerId],
    secret,
    secondSecret: secondSecret,
    message,
  });
}

export { registerNftMaker, createNft };
