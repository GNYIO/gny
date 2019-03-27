import * as crypto from 'crypto';
import * as bs58 from 'bs58';

export default {
  generateAddress,
  isAddress,
};

export function generateAddress(publicKey: string) {
  const PREFIX = 'G';
  const hash1 = crypto
    .createHash('sha256')
    .update(Buffer.from(publicKey, 'hex'))
    .digest();
  const hash2 = crypto
    .createHash('ripemd160')
    .update(hash1)
    .digest();
  return PREFIX + bs58.encode(hash2);
}

export function isAddress(address: string) {
  if (typeof address !== 'string') {
    return false;
  }
  try {
    if (address.length === 0) {
      return false;
    }

    if (!bs58.decode(address.slice(1))) {
      return false;
    }
  } catch (err) {
    return false;
  }
  if (address[0] !== 'G') {
    return false;
  }
  return true;
}
