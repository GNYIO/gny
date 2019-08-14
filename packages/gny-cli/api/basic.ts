import * as crypto from 'crypto';
import * as ed from '../../../src/utils/ed';
import Api from '../lib/api';
import { TransactionBase } from '../../../src/base/transaction';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
  });
}

function setSecondSecret(options) {
  // const trs = TransactionBase.create(options.secret, options.secondSecret);
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  const keys = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(options.secondSecret, 'utf8')
      .digest()
  );
  const secondSignature = {
    publicKey: keys.publicKey,
  };

  const trs = TransactionBase.create({
    type: 2,
    fee: String(5 * 1e8),
    args: [secondSignature.publicKey],
    keypair: keypair,
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function lock(options) {
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
    type: 1,
    fee: String(options.fee) || String(10000000),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.amount, options.to],
  });

  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

export default function basic(program) {
  globalOptions = program;

  program
    .command('setsecondsecret')
    .description('set second secret')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .action(setSecondSecret);

  program
    .command('lock')
    .description('lock account transfer')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-h, --height <height>', 'lock height')
    .action(lock);
}
