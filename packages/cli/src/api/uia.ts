import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { TransactionBase } from '@gny/base';
import { Api, ApiConfig } from '../lib/api';
import { ITransaction } from '@gny/interfaces';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function sendAsset(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  const secondKeypair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(options.secondSecret, 'utf8')
      .digest()
  );
  const trs = TransactionBase.create({
    type: 103,
    fee: String(10000000),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.currency, options.amount, options.recipient],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function registerDelegate(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  const secondKeypair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(options.secondSecret, 'utf8')
      .digest()
  );
  const trs = TransactionBase.create({
    type: 10,
    fee: String(100 * 1e8),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

export default function uia(program: ApiConfig) {
  globalOptions = program;

  program
    .command('sendasset')
    .description('send asset to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-c, --currency <currency>', '')
    .option('-a, --amount <amount>', '')
    .option('-r, --recipient <address>', '')
    .option('-m, --message <message>', '')
    .action(sendAsset);

  program
    .command('registerdelegate')
    .description('register delegate')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-u, --username <username>', '')
    .action(registerDelegate);
}
