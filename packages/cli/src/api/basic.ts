import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import api, { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { TransactionBase } from '@gny/base';
import { KeyPair } from '@gny/interfaces';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function setSecondSecret(options) {
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

  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export async function lock(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
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

  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export async function vote(options) {
  const secret = options.secret;
  const publicKeys = options.publicKeys;
  const keyList = publicKeys.split(',').map(function(el) {
    return el;
  });
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }
  const trs = TransactionBase.create({
    type: 4,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair,
    args: keyList,
  });

  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export async function unvote(options) {
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

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionBase.create({
    type: 5,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: keyList,
  });

  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export async function listDiffVotes(options) {
  const params = {
    username: options.username,
    address: options.address,
    publicKey: options.publicKey,
  };

  const resultA: any = await Api.get(baseUrl + '/api/delegates/get', params);
  const usernameA = resultA.delegate.username;
  const addressA = resultA.delegate.address;

  const paramsA = {
    usename: usernameA,
    address: addressA,
  };
  const votersA: any = await Api.get(
    baseUrl + '/api/accounts/getVotes',
    paramsA
  );
  const delegatesListA = votersA.delegates.map(delegate => delegate.username);
  const setA = new Set(delegatesListA);

  const paramsB = {
    username: usernameA,
  };
  const votersB: any = await Api.get('/api/delegates/getVoters', paramsB);
  const delegatesListB = votersB.accounts.map(account => account.username);
  const setB = new Set(delegatesListB);

  const diffAB = [...Array.from(setA)].filter(x => !setB.has(x));
  const diffBA = [...Array.from(setB)].filter(x => !setA.has(x));

  console.log("you voted but doesn't vote you: \n\t", JSON.stringify(diffAB));
  console.log("\nvoted you but you don't voted: \n\t", JSON.stringify(diffBA));
}

export default function basic(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('setsecondsecret')
    .description('set second secret')
    .requiredOption('-e, --secret <secret>', '')
    .requiredOption('-s, --secondSecret <secret>', '')
    .action(setSecondSecret);

  program
    .command('lock')
    .description('lock account transfer')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-h, --height <height>', 'lock height')
    .requiredOption('-m, --amount <amount>', 'lock amount')
    .action(lock);

  program
    .command('vote')
    .description('vote for delegates')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-p, --publicKeys <public key list>', '')
    .action(vote);

  program
    .command('unvote')
    .description('cancel vote for delegates')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-p, --publicKeys <public key list>', '')
    .action(unvote);

  program
    .command('listdiffvotes')
    .description('list the votes by each other')
    .option('-u, --username <username>', '')
    .option('-a, --address <address>', '')
    .action(listDiffVotes);
}
