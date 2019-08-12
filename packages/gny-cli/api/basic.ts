import * as gnyJS from '@gny/gny-js';
import Api from '../lib/api';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
  });
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function setSecondSecret(options) {
  const trs = gnyJS.basic.setSecondSecret(options.secret, options.secondSecret);
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function lock(options) {
  const trs = gnyJS.transaction.createLock(
    options.height,
    options.secret,
    options.secondSecret
  );
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
