import * as fs from 'fs';

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

function getUnconfirmedTransactions(options) {
  const params = {
    senderPublicKey: options.key,
    address: options.address,
  };
  getApi().get('/api/transactions/unconfirmed', params, function(err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransactions(options) {
  const params = {
    blockId: options.blockId,
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    type: options.type,
    senderPublicKey: options.senderPublicKey,
    senderId: options.senderId,
    recipientId: options.recipientId,
    amount: options.amount,
    fee: options.fee,
    message: options.message,
  };
  getApi().get('/api/transactions/', params, function(err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransaction(id) {
  const params = { id: id };
  getApi().get('/api/transactions/get', params, function(err, result) {
    console.log(err || pretty(result.transaction));
  });
}

function sendMoney(options) {
  // var params = {
  //   secret: options.secret,
  //   secondSecret: options.secondSecret,
  //   recipientId: options.to,
  //   amount: Number(options.amount)
  // };
  // getApi().put('/api/transactions/', params, function (err, result) {
  //   console.log(err || result);
  // });
  const trs = gnyJS.transaction.createTransactionEx({
    type: 1,
    fee: Number(options.fee) || 10000000,
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: [options.amount, options.to],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function sendAsset(options) {
  const trs = gnyJS.uia.createTransfer(
    options.currency,
    options.amount,
    options.to,
    options.message,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function registerDelegate(options) {
  // var params = {
  //   secret: options.secret,
  //   username: options.username,
  //   secondSecret: options.secondSecret,
  // };
  // getApi().put('/api/delegates/', params, function (err, result) {
  //   console.log(err || result);
  // });
  const trs = gnyJS.delegate.createDelegate(
    options.username,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function transaction(options) {
  const trs = gnyJS.transaction.createTransactionEx({
    type: Number(options.type),
    fee: Number(options.fee) || 10000000,
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: JSON.parse(options.args),
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
}

function getTransactionBytes(options: any) {
  let trs;
  try {
    trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(gnyJS.crypto.getBytes(trs, true, true).toString('hex'));
}

function getTransactionId(options) {
  let trs;
  try {
    trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(gnyJS.crypto.getId(trs));
}

function verifyBytes(options) {
  console.log(
    gnyJS.crypto.verifyBytes(
      options.bytes,
      options.signature,
      options.publicKey
    )
  );
}

export default function account(program) {
  globalOptions = program;

  program
    .command('getunconfirmedtransactions')
    .description('get unconfirmed transactions')
    .option('-k, --key <sender public key>', '')
    .option('-a, --address <address>', '')
    .action(getUnconfirmedTransactions);

  program
    .command('gettransactions')
    .description('get transactions')
    .option('-b, --blockId <id>', '')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-t, --type <n>', 'transaction type')
    .option('-s, --sort <field:mode>', '')
    .option('-a, --amount <n>', '')
    .option('-f, --fee <n>', '')
    .option('-m, --message <message>', '')
    .option('--senderPublicKey <key>', '')
    .option('--senderId <id>', '')
    .option('--recipientId <id>', '')
    .action(getTransactions);

  program
    .command('gettransaction [id]')
    .description('get transactions')
    .action(getTransaction);

  program
    .command('sendmoney')
    .description('send money to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-a, --amount <n>', '')
    .option('-f, --fee <n>', '')
    .option('-t, --to <address>', '')
    .option('-m, --message <message>', '')
    .action(sendMoney);

  program
    .command('sendasset')
    .description('send asset to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-c, --currency <currency>', '')
    .option('-a, --amount <amount>', '')
    .option('-t, --to <address>', '')
    .option('-m, --message <message>', '')
    .action(sendAsset);

  program
    .command('registerdelegate')
    .description('register delegate')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-u, --username <username>', '')
    .action(registerDelegate);

  program
    .command('gettransactionbytes')
    .description('get transaction bytes')
    .option('-f, --file <file>', 'transaction file')
    .action(getTransactionBytes);

  program
    .command('gettransactionid')
    .description('get transaction id')
    .option('-f, --file <file>', 'transaction file')
    .action(getTransactionId);

  program
    .command('verifybytes')
    .description('verify bytes/signature/publickey')
    .option('-b, --bytes <bytes>', 'transaction or block bytes')
    .option('-s, --signature <signature>', 'transaction or block signature')
    .option('-p, --publicKey <publicKey>', 'signer public key')
    .action(verifyBytes);

  program
    .command('transaction')
    .description('create a transaction in mainchain')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-t, --type <type>', 'transaction type')
    .option('-a, --args <args>', 'json array format')
    .option('-m, --message <message>', '')
    .option('-f, --fee <fee>', 'transaction fee')
    .action(transaction);
}
