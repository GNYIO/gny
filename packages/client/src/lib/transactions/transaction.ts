import * as webBase from '@gny/web-base';
import { TransactionWebBase } from '@gny/web-base';
import { slots } from '@gny/utils';
import { ITransaction, NaclKeyPair } from '@gny/interfaces';
import { generateAddress } from '@gny/utils';

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

  let secondKeys: { keypair: NaclKeyPair };
  if (params.secondSecret) {
    secondKeys = webBase.getKeys(params.secondSecret);
  }

  const transaction = TransactionWebBase.create({
    keypair: keys.keypair,
    secondKeypair: secondKeys.keypair,
    type: params.type,
    fee: String(params.fee),
    message: params.message,
    args: params.args,
  });

  return transaction;
}
