import * as ed from '@gny/ed';
import * as crypto from 'crypto';
import { generateAddress } from '@gny/utils';

export function account(secret: string) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const kp = ed.generateKeyPair(hash);
  const address = generateAddress(kp.publicKey.toString('hex'));

  return {
    keypair: kp,
    address: address,
    secret: secret,
  };
}

export default {
  account: account,
};
