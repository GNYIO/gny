import * as crypto from 'crypto';
import { Api, ApiConfig } from '../lib/api';
import * as ed from '@gny/ed';
import { TransactionBase } from '@gny/base';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function vote(secret, publicKeys, secondSecret) {
  const keyList = publicKeys.split(',').map(function(el) {
    return el;
  });
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  const secondKeypair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(secondSecret, 'utf8')
      .digest()
  );
  const trs = TransactionBase.create({
    type: 4,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: keyList,
  });

  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function unvote(secret, publicKeys, secondSecret) {
  const keyList = publicKeys.split(',').map(function(el) {
    return el;
  });
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  const secondKeypair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(secondSecret, 'utf8')
      .digest()
  );
  const trs = TransactionBase.create({
    type: 5,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: keyList,
  });

  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

export default function account(program: ApiConfig) {
  globalOptions = program;

  program
    .command('vote')
    .description('vote for delegates')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-p, --publicKeys <public key list>', '')
    .action(vote);

  program
    .command('unvote')
    .description('cancel vote for delegates')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-p, --publicKeys <public key list>', '')
    .action(unvote);
}
