import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { Api, ApiConfig } from '../lib/api';
import { TransactionBase } from '@gny/base';

let globalOptions: ApiConfig;

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
    publicKey: Buffer.from(keys.publicKey).toString('hex'),
  };

  const trs = TransactionBase.create({
    type: 2,
    fee: String(5 * 1e8),
    args: [secondSignature.publicKey],
    keypair: keypair,
  });

  getApi().broadcastTransaction(trs, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(result.transactionId);
    }
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
    args: [String(options.height), String(options.amout)],
  });

  getApi().broadcastTransaction(trs, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(result.transactionId);
    }
  });
}

function vote(options) {
  const secret = options.secret;
  const publicKeys = options.publicKeys;
  const secondSecret = options.secondSecret;
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
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(result.transactionId);
    }
  });
}

function unvote(options) {
  const secret = options.secret;
  const publicKeys = options.publicKeys;
  const secondSecret = options.secondSecret;
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
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(result.transactionId);
    }
  });
}

function listDiffVotes(options) {
  const params = {
    username: options.username,
    publicKey: options.publicKey,
    address: options.address,
  };
  getApi().get('/api/delegates/get', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    const username = result.delegate.username;
    const params = {
      address: result.delegate.address,
      username: result.delegate.username,
    };
    getApi().get('/api/accounts/getVotes', params, function(err, result) {
      if (err) {
        console.log(err);
        process.exit(1);
      }

      const names_a = result.delegates.map(delegate => delegate.username);
      const a = new Set(names_a);
      const params = { username: username };
      getApi().get('/api/delegates/getVoters', params, function(err, result) {
        if (err) {
          console.log(err);
          process.exit(1);
        }

        const names_b = result.accounts.map(account => account.username);
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

export default function basic(program: ApiConfig) {
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

  program
    .command('listdiffvotes')
    .description('list the votes by each other')
    .option('-u, --username <username>', '')
    .option('-p, --publicKey <publicKey>', '')
    .option('-a, --address <address>', '')
    .action(listDiffVotes);
}
