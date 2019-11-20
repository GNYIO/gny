import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { TransactionBase } from '@gny/base';
import Api from '../lib/api';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
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
    limit: options.limit,
    offset: options.offset,
    id: options.id,
    senderId: options.senderId,
    senderPublicKey: options.senderPublicKey,
    blockId: options.blockId,
    type: options.type,
    height: options.height,
    message: options.message,
  };
  getApi().get('/api/transactions/', params, function(err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getUnconfirmedTransaction(id) {
  const params = { id: id };
  getApi().get('/api/transactions/get', params, function(err, result) {
    console.log(err || pretty(result.transaction));
  });
}

function sendMoney(options) {
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
    type: 0,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.amount, options.recipient],
    message: options.message,
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    console.log(err || result.transactionId);
  });
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

function transaction(options) {
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
    type: Number(options.type),
    fee: String(options.fee) || String(10000000),
    message: options.message,
    args: JSON.parse(options.args),
    keypair: keypair,
    secondKeypair: secondKeypair,
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
  console.log(TransactionBase.getBytes(trs, true, true).toString('hex'));
}

function getTransactionId(options) {
  let trs;
  try {
    trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(TransactionBase.getId(trs));
}

function verifyBytes(options) {
  console.log(
    TransactionBase.verifyBytes(
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
    .option('-h, --height <n>', '')
    .option('-m, --message <message>', '')
    .option('--senderPublicKey <key>', '')
    .option('--senderId <id>', '')
    .option('-i, --id <id>', '')
    .action(getTransactions);

  program
    .command('gettransaction [id]')
    .description('get unconfirmed transaction by id')
    .action(getUnconfirmedTransaction);

  program
    .command('sendmoney')
    .description('send money to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-a, --amount <n>', '')
    .option('-r, --recipient <address>', '')
    .option('-m, --message <message>', '')
    .action(sendMoney);

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
