import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { TransactionBase } from '@gny/base';
import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { KeyPair } from '@gny/interfaces';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function getIssuers(options) {
  const params = {
    limit: options.limit,
    offest: options.offset,
  };
  await Api.get(baseUrl + '/api/uia/issuers', params);
}

export async function isIssuer(address: string) {
  const params = {
    address: address,
  };
  await Api.get(baseUrl + '/api/uia/isIssuer', params);
}

export async function getIssuer(name: string) {
  const params = {
    name: name,
  };
  await Api.get(baseUrl + '/api/uia/issuers', params);
}

export async function getIssuerAssets(name: string) {
  await Api.get(baseUrl + `/api/uia/issuers/${name}/assets`);
}

export async function getAssets(options) {
  const params = {
    limit: options.limit,
    offest: options.offset,
  };
  await Api.get(baseUrl + '/api/uia/assets', params);
}

export async function getAsset(name: string) {
  const params = {
    name: name,
  };
  await Api.get(baseUrl + '/api/uia/assets', params);
}

export async function getBalances(options) {
  const params = {
    address: options.address,
    limit: options.limit,
    offset: options.offset,
  };
  await Api.get(baseUrl + '/api/uia/balances', params);
}

export async function getBalance(options) {
  const params = {
    address: options.address,
    currency: options.currency,
  };
  await Api.get(baseUrl + '/api/uia/balances', params);
}

export async function sendAsset(options) {
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
    type: 103,
    fee: String(10000000),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.currency, options.amount, options.recipient],
  });
  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export async function registerIssuer(options) {
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
    type: 100,
    fee: String(100 * 1e8),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.name, options.desc],
  });

  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export async function registerAsset(options) {
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
    type: 101,
    fee: String(500 * 1e8),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.name, options.desc, options.maximum, options.precision],
  });

  await Api.post(baseUrl + '/peer/transactions', { transaction: trs });
}

export default function uia(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('getissuers')
    .description('get issuers')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getIssuers);

  program
    .command('isissuer <address>')
    .description('check if is an issuer by address')
    .action(isIssuer);

  program
    .command('getissuer <name>')
    .description('get issuer by name')
    .action(getIssuer);

  program
    .command('getissuerassets <name>')
    .description('get issuer assets by name')
    .action(getIssuerAssets);

  program
    .command('getassets')
    .description('get assets')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getAssets);

  program
    .command('getasset <name>')
    .description('get asset by name')
    .action(getAsset);

  program
    .command('getbalances <address>')
    .description('get balances by address')
    .option('-a, --address <address>', '')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getBalances);

  program
    .command('getbalancebycurrency')
    .description('get balance by address and currency')
    .requiredOption('-a, --address <address>', '')
    .requiredOption('-c, --currency <currency>', '')
    .action(getBalance);

  program
    .command('sendasset')
    .description('send asset to some address')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-c, --currency <currency>', '')
    .requiredOption('-a, --amount <amount>', '')
    .requiredOption('-r, --recipient <address>', '')
    .option('-m, --message <message>', '')
    .action(sendAsset);

  program
    .command('registerissuer')
    .description('register delegate')
    .requiredOption('--secret <secret>')
    .requiredOption('--name <name>')
    .requiredOption('-d, --desc <descrption>', '')
    .option('--secondSecret <secret>')
    .action(registerIssuer);

  program
    .command('registerasset')
    .description('register delegate')
    .requiredOption('--secret <secret>')
    .requiredOption('--name <name>')
    .requiredOption('-d, --desc <desc>', '')
    .requiredOption('-m, --maximum <maximum>', '')
    .requiredOption('-p, --precision <precision>', '')
    .option('--secondSecret <secret>')
    .action(registerAsset);
}
