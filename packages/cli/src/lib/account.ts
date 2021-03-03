import * as webEd from '@gny/web-ed';
import * as crypto from 'crypto';
import { generateAddress } from '@gny/utils';
import { KeyPair } from '@gny/interfaces';

export type AccountType = {
  keypair: KeyPair;
  address: string;
  secret: string;
};
export function account(secret: string): AccountType {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const kp = webEd.generateKeyPair(hash);
  const address = generateAddress(kp.publicKey.toString('hex'));

  return <AccountType>{
    keypair: kp,
    address: address,
    secret: secret,
  };
}

export default {
  account: account,
};
