import * as webBase from '@gny/web-base';
import { slots } from '@gny/utils';
import { ITransaction } from '@gny/interfaces';

interface Params {
  type: number;
  fee: string;
  args: (string | number)[];
  secret: string;
  message?: string;
  secondSecret?: string;
}
export function createTransactionEx(params: Params) {
  if (!params.secret) throw new Error('Secret needed');
  const keys = webBase.getKeys(params.secret);
  const transaction = {
    type: params.type,
    timestamp: slots.getEpochTime(),
    fee: String(params.fee),
    message: params.message,
    args: params.args,
    senderPublicKey: keys.publicKey,
    senderId: webBase.getAddress(keys.publicKey),
    signatures: [],
  } as ITransaction;
  transaction.signatures.push(webBase.sign(transaction, keys.keypair));
  if (params.secondSecret) {
    const secondKeys = webBase.getKeys(params.secondSecret);
    transaction.secondSignature = webBase.secondSign(
      transaction,
      secondKeys.keypair
    );
  }
  transaction.id = webBase.getId(transaction);
  return transaction as ITransaction;
}
