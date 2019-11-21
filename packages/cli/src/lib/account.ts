import * as crypto from '@gny/web-ed';

export function account(secret: string) {
  const kp = crypto.keypair(secret);
  const address = crypto.getAddress(kp.publicKey);

  return {
    keypair: kp,
    address: address,
    secret: secret,
  };
}

export function isValidSecret(secret: string) {
  return crypto.isValidSecret(secret);
}

export default {
  account: account,
  isValidSecret: isValidSecret,
};
