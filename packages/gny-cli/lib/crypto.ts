// import * as nacl_factory from 'js-nacl';
import * as crypto from 'crypto-browserify';
import * as Mnemonic from 'bitcore-mnemonic';
// import * as gnyJS from '../../../packages/gny-js';
import * as gnyJS from '@gny/gny-js';
import * as nacl from 'tweetnacl';

// var nacl_factory = require('js-nacl');

// let nacl;
// nacl_factory.instantiate(function (nacl_instance) {
// 	nacl = nacl_instance;
// });

export let randomString = function(max) {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%^&*@';

  for (let i = 0; i < max; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
};

export let keypair = function(secret) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  // var kp = nacl.crypto_sign_keypair_from_seed(hash);
  const kp = nacl.box.keyPair.fromSecretKey(hash);

  const keypair = {
    publicKey: new Buffer(kp.publicKey).toString('hex'),
    privateKey: new Buffer(kp.secretKey).toString('hex'),
  };

  return keypair;
};

export let sign = function(keypair, data) {
  const hash = crypto
    .createHash('sha256')
    .update(data)
    .digest();
  // var signature = nacl.crypto_sign_detached(hash, new Buffer(keypair.privateKey, 'hex'));
  const signature = nacl.sign.detached(
    hash,
    new Buffer(keypair.privateKey, 'hex')
  );
  return new Buffer(signature).toString('hex');
};

export let getId = function(data) {
  const hash = crypto
    .createHash('sha256')
    .update(data)
    .digest();
  return hash.toString('hex');
};

export function generateSecret() {
  return new Mnemonic(Mnemonic.Words.ENGLISH).toString();
}

export function isValidSecret(secret) {
  return Mnemonic.isValid(secret);
}

export function getAddress(publicKey) {
  return gnyJS.crypto.getAddress(publicKey);
}

export default {
  keypair: keypair,
  sign: sign,
  getId: getId,
  randomString: randomString,
  generateSecret: generateSecret,
  isValidSecret: isValidSecret,
  getAddress: getAddress,
};
