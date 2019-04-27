const crypto = require('crypto');
const base58check = require('./base58check');
const bs58 = require('bs58');

const NORMAL_PREFIX = 'G';

const VALID_PREFIX = [NORMAL_PREFIX];

const TYPE = {
  NONE: 0,
  NORMAL: 1,
};

const PREFIX_MAP = {};
PREFIX_MAP[NORMAL_PREFIX] = TYPE.NORMAL;

function generateRawBase58CheckAddress(hashes) {
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

module.exports = {
  TYPE,
  getType(address) {
    const prefix = address[0];
    if (PREFIX_MAP[prefix]) {
      return PREFIX_MAP[prefix];
    }
    return TYPE.NONE;
  },
  isAddress(address) {
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
  },
  isBase58CheckAddress(address) {
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
  },
  isNormalAddress(address) {
    return this.isBase58CheckAddress(address) && address[0] === NORMAL_PREFIX;
  },
  generateNormalAddress(publicKey) {
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
  },
};
