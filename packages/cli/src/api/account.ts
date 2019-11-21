import * as inquirer from 'inquirer';

import Api from '../lib/api';
import * as cryptoLib from '@gny/web-ed';
import * as accountHelper from '../lib/account';

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

function openAccount(secret) {
  getApi().post('/api/accounts/open', { secret: secret }, function(
    err,
    result
  ) {
    console.log(err || pretty(result.account));
  });
}

function getBalance(address) {
  const params = { address: address };
  getApi().get('/api/accounts/getBalance', params, function(err, result) {
    console.log(err || result.balances);
  });
}

function getAccount(address) {
  const params = { address: address };
  getApi().get('/api/accounts/', params, function(err, result) {
    console.log(err || pretty(result));
  });
}

function getVotedDelegates(options) {
  const params = {
    address: options.address,
    username: options.username,
  };
  getApi().get('/api/accounts/getVotes', params, function(err, result) {
    console.log(err || result);
  });
}

function countAccounts() {
  getApi().get('/api/accounts/count', function(err, result) {
    console.log(err || result.count);
  });
}

async function getPublicKey(address) {
  const params = {
    address: address,
  };
  getApi().get('/api/accounts/getPublicKey', params, function(err, result) {
    console.log(err || result);
  });
}

async function genPublicKey(secret) {
  const data = {
    secret: secret,
  };
  getApi().post('/api/accounts/generatePublicKey', data, function(err, result) {
    console.log(err || result);
  });
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
    const a = accountHelper.account(cryptoLib.generateSecret());
    accounts.push({
      address: a.address,
      secret: a.secret,
      publicKey: a.keypair.publicKey,
    });
  }
  console.log(accounts);
  console.log('Done');
}

export default function account(program) {
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
    .command('getaccount [address]')
    .description('get account by address')
    .action(getAccount);

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
