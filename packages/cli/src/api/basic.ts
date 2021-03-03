import * as crypto from 'crypto';
import * as webEd from '@gny/web-ed';
import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { TransactionWebBase } from '@gny/web-base';
import { KeyPair } from '@gny/interfaces';
import { getBaseUrl } from '../getBaseUrl';

export async function setUserName(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = webEd.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionWebBase.create({
    type: 1,
    fee: String(5 * 1e8),
    args: [options.username],
    keypair: keypair,
    secondKeypair: secondKeypair,
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function setSecondSecret(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);
  const keys = webEd.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(options.secondSecret, 'utf8')
      .digest()
  );
  const secondSignature = {
    publicKey: Buffer.from(keys.publicKey).toString('hex'),
  };

  const trs = TransactionWebBase.create({
    type: 2,
    fee: String(5 * 1e8),
    args: [secondSignature.publicKey],
    keypair: keypair,
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function lock(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = webEd.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionWebBase.create({
    type: 3,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [String(options.height), String(options.amount)],
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function unlock(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = webEd.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionWebBase.create({
    type: 6,
    fee: String(0),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [],
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function vote(options) {
  const secret = options.secret;
  const usernames = options.usernames;
  const keyList = usernames.split(',').map(function(el) {
    return el;
  });
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = webEd.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }
  const trs = TransactionWebBase.create({
    type: 4,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair,
    args: keyList,
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function unvote(options) {
  const secret = options.secret;
  const usernames = options.usernames;
  const secondSecret = options.secondSecret;
  const keyList = usernames.split(',').map(function(el) {
    return el;
  });
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = webEd.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionWebBase.create({
    type: 5,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: keyList,
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function registerDelegate(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = webEd.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = webEd.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }
  const trs = TransactionWebBase.create({
    type: 10,
    fee: String(100 * 1e8),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [],
  });

  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function listDiffVotes(options) {
  const params = {
    username: options.username,
    address: options.address,
    publicKey: options.publicKey,
  };

  const resultA: any = await Api.get(
    getBaseUrl() + '/api/delegates/get',
    params
  );
  const usernameA = resultA.delegate.username;
  const addressA = resultA.delegate.address;

  const paramsA = {
    usename: usernameA,
    address: addressA,
  };
  const votersA: any = await Api.get(
    getBaseUrl() + '/api/accounts/getVotes',
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
  program
    .command('setusername')
    .description('set user name')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-u, --username <username>', '')
    .action(setUserName);

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
    .command('unlock')
    .description('unlock account transfer')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .action(unlock);

  program
    .command('vote')
    .description('vote for delegates')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption(
      '-u, --usernames <usernames>',
      'comma separeted usernames. eg. liangpeili,xpgeng,a1300'
    )
    .action(vote);

  program
    .command('unvote')
    .description('cancel vote for delegates')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption(
      '-u, --usernames <usernames>',
      'comma separeted usernames. eg. liangpeili,xpgeng,a1300'
    )
    .action(unvote);

  program
    .command('registerdelegate')
    .description('register delegate')
    .requiredOption('--secret <secret>')
    .option('--secondSecret <secret>')
    .action(registerDelegate);

  program
    .command('listdiffvotes')
    .description('list the votes by each other')
    .option('-u, --username <username>', '')
    .option('-a, --address <address>', '')
    .action(listDiffVotes);
}
