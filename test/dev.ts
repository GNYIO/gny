import * as ed from '../packages/ed';
import * as addressUtil from '../src/utils/address';
import * as crypto from 'crypto';

const randomString = 'ABCDEFGH';
const hash = crypto
  .createHash('sha256')
  .update(randomString, 'utf8')
  .digest();
const keys = ed.generateKeyPair(hash);
const publicKey = keys.publicKey.toString('hex');
console.log(publicKey);

// const address = addressUtil.generateAddress(publicKey);

// console.log(address);

const address = 'GeVw2DVnLMx4ppcToj';
const result = addressUtil.isAddress(address);
console.log(result);
