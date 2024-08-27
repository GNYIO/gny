import * as transaction from './transaction.js';
export { MessageWebBase } from '@gnyio/web-base';

function createVerification(
  identifier: string,
  signature: string,
  secret: string,
  secondSecret?: string
) {
  return transaction.createTransactionEx({
    type: 400,
    fee: String(0.1 * 1e8),
    args: [identifier, signature],
    secret,
    secondSecret: secondSecret,
  });
}

export { createVerification };
