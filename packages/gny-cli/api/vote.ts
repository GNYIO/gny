import * as crypto from 'crypto';
import Api from '../lib/api';
import * as ed from '../../../src/utils/ed';
import { TransactionBase } from '../../../src/base/transaction';

let globalOptions;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
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

function listdiffvotes(options) {
  const params = { username: options.username };
  getApi().get('/api/delegates/get', params, function(err, result) {
    const publicKey = result.delegate.publicKey;
    const params = {
      address: result.delegate.address,
      limit: options.limit || 101,
      offset: options.offset || 0,
    };
    getApi().get('/api/accounts/delegates', params, function(err, result) {
      const names_a: String[] = [];
      for (let i = 0; i < result.delegates.length; ++i) {
        names_a[i] = result.delegates[i].username;
      }
      const a = new Set(names_a);
      const params = { publicKey: publicKey };
      getApi().get('/api/delegates/voters', params, function(err, result) {
        const names_b: String[] = [];
        for (let i = 0; i < result.accounts.length; ++i) {
          names_b[i] = result.accounts[i].username;
        }
        const b = new Set(names_b);
        const diffab = [...a].filter(x => !b.has(x));
        const diffba = [...b].filter(x => !a.has(x));
        console.log(
          "you voted but doesn't vote you: \n\t",
          JSON.stringify(diffab)
        );
        console.log(
          "\nvoted you but you don't voted: \n\t",
          JSON.stringify(diffba)
        );
      });
    });
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

export default function account(program) {
  globalOptions = program;

  program
    .command('listdiffvotes')
    .description('list the votes each other')
    .option('-u, --username <username>', '', process.env.ASCH_USER)
    .action(listdiffvotes);

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
