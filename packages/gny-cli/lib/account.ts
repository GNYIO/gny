import * as crypto from '../lib/crypto';

export function account(secret) {
  const kp = crypto.keypair(secret);
  const address = crypto.getAddress(new Buffer(kp.publicKey, 'hex'));

  return {
    keypair: kp,
    address: address,
    secret: secret,
  };
}

export function isValidSecret(secret) {
  return crypto.isValidSecret(secret);
}

export default {
  account: account,
  isValidSecret: isValidSecret,
};
