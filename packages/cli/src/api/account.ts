import * as inquirer from 'inquirer';
import { Api, ApiConfig } from '../lib/api';
import { generateSecret } from '@gny/utils';
import * as accountHelper from '../lib/account';
import { AddressOrUsername } from '@gny/interfaces';
import { generateKeyPair } from '@gny/ed';
import * as crypto from 'crypto';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

function openAccount(publicKey: string) {
  getApi().post('/api/accounts/openAccount', { publicKey: publicKey }, function(
    err,
    result
  ) {
    console.log(err || pretty(result.account));
  });
}

function getBalance(address: string) {
  const params = { address: address };
  getApi().get('/api/accounts/getBalance', params, function(err, result) {
    console.log(err || result.balances);
  });
}

function getAccountByAddress(address: string) {
  const params = { address: address };
  getApi().get('/api/accounts/', params, function(err, result) {
    console.log(err || pretty(result));
  });
}

function getAccountByUsername(username: string) {
  const params = { username: username };
  getApi().get('/api/accounts/', params, function(err, result) {
    console.log(err || pretty(result));
  });
}

function getVotedDelegates(options: AddressOrUsername) {
  getApi().get('/api/accounts/getVotes', options, function(err, result) {
    console.log(err || result);
  });
}

function countAccounts() {
  getApi().get('/api/accounts/count', function(err, result) {
    console.log(err || result.count);
  });
}

async function getPublicKey(address: string) {
  const params = {
    address: address,
  };
  getApi().get('/api/accounts/getPublicKey', params, function(err, result) {
    console.log(err || result);
  });
}

async function genPublicKey(secret: string) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keys = generateKeyPair(hash);
  console.log(keys.publicKey.toString('hex'));
}

async function genAccount() {
  const result: any = await inquirer.prompt([
    {
      type: 'input',
      name: 'amount',
      message: 'Enter number of accounts to generate',
    },
  ]);
  const n = parseInt(result.amount);
  const accounts = [];

  for (let i = 0; i < n; i++) {
    const one = accountHelper.account(generateSecret());
    accounts.push({
      address: one.address,
      secret: one.secret,
      publicKey: one.keypair.publicKey,
    });
  }
  console.log(accounts);
  console.log('Done');
}

export default function account(program: ApiConfig) {
  globalOptions = program;

  program
    .command('openaccount [secret]')
    .description('open your account and get the infomation by secret')
    .action(openAccount);

  program
    .command('getbalance [address]')
    .description('get balance by address')
    .action(getBalance);

  program
    .command('getaccountbyaddress [address]')
    .description('get account by address')
    .action(getAccountByAddress);

  program
    .command('getaccountbyusername [username]')
    .description('get account by username')
    .action(getAccountByUsername);

  program
    .command('countaccounts')
    .description('get the number of accounts')
    .action(countAccounts);

  program
    .command('getvoteddelegates')
    .description('get delegates voted by address')
    .option('-u, --username [username]', '')
    .option('-a, --address [address]', '')
    .action(getVotedDelegates);

  program
    .command('getpublickey [address]')
    .description('get public key by address')
    .action(getPublicKey);

  program
    .command('genpublickey [secret]')
    .description('generate public key by secret')
    .action(genPublicKey);

  program
    .command('genaccount')
    .description('generate accounts')
    .action(genAccount);
}
