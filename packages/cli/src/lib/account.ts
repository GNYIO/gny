import * as webBase from '@gny/web-base';
import { generateAddress } from '@gny/utils';

export function account(secret: string) {
  const kp = webBase.getKeys(secret);
  const address = generateAddress(kp.publicKey);

  return {
    keypair: kp,
    address: address,
    secret: secret,
  };
}

export default {
  account: account,
};
