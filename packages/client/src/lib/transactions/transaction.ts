import * as webBase from '@gny/web-base';
import { TransactionWebBase } from '@gny/web-base';
import { NaclKeyPair } from '@gny/interfaces';

export interface Params {
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

  if (params.secondSecret) {
    const secondKeys = webBase.getKeys(params.secondSecret);
    return TransactionWebBase.create({
      keypair: keys.keypair,
      secondKeypair: secondKeys.keypair,
      type: params.type,
      fee: String(params.fee),
      message: params.message,
      args: params.args,
    });
  }

  return TransactionWebBase.create({
    keypair: keys.keypair,
    type: params.type,
    fee: String(params.fee),
    message: params.message,
    args: params.args,
  });
}
