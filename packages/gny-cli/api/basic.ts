import * as crypto from 'crypto';
import * as ed from '../../../packages/ed';
import Api from '../lib/api';
import { TransactionBase } from '../../../packages/base/transactionBase';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function setSecondSecret(options) {
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
    publicKey: keys.publicKey.toString('hex'),
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
  let secondKeypair;
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  if (options.secondSecret) {
    secondKeypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionBase.create({
    type: 3,
    fee: String(10000000),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.height, options.amout],
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
    .option('-m, --amount <amount>', 'lock amount')
    .action(lock);
}
