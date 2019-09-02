import * as crypto from 'crypto';
import * as bs58 from 'bs58';
import * as base58check from './base58check';

const NORMAL_PREFIX = 'G';

const VALID_PREFIX = [NORMAL_PREFIX];

const TYPE = {
  NONE: 0,
  NORMAL: 1,
};

const PREFIX_MAP: any = {};
PREFIX_MAP[NORMAL_PREFIX] = TYPE.NORMAL;

export function generateRawBase58CheckAddress(hashes: any) {
  if (!hashes || !hashes.length) throw new Error('Invalid hashes');
  let h1 = null;
  for (let h of hashes) {
    if (typeof h === 'string') {
      h = Buffer.from(h, 'hex');
    }
    h1 = crypto.createHash('sha256').update(h);
  }
  const h2 = crypto
    .createHash('ripemd160')
    .update(h1.digest())
    .digest();
  return base58check.encode(h2);
}

export class AddressHelper {
  TYPE: any;
  public getType(address: string) {
    const prefix = address[0];
    if (PREFIX_MAP[prefix]) {
      return PREFIX_MAP[prefix];
    }
    return TYPE.NONE;
  }
  public isAddress(address: string) {
    if (typeof address !== 'string') {
      return false;
    }
    if (!/^[0-9]{1,20}$/g.test(address)) {
      if (!base58check.decodeUnsafe(address.slice(1))) {
        return false;
      }
      if (VALID_PREFIX.indexOf(address[0]) === -1) {
        return false;
      }
    }
    return true;
  }
  public isBase58CheckAddress(address: string) {
    if (typeof address !== 'string') {
      return false;
    }
    if (!base58check.decodeUnsafe(address.slice(1))) {
      return false;
    }
    if (VALID_PREFIX.indexOf(address[0]) === -1) {
      return false;
    }
    return true;
  }
  public isNormalAddress(address: string) {
    return this.isBase58CheckAddress(address) && address[0] === NORMAL_PREFIX;
  }
  public generateNormalAddress(publicKey: string) {
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
}
