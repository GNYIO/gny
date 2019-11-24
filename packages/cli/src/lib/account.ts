import * as webBase from '@gny/web-base';

export function account(secret: string) {
  const kp = webBase.keypair(secret);
  const address = webBase.getAddress(kp.publicKey);

  return {
    keypair: kp,
    address: address,
    secret: secret,
  };
}

export default {
  account: account,
};
