import * as inquirer from 'inquirer';

import Api from '../helpers/api';
import * as cryptoLib from '../lib/crypto';
import * as accountHelper from '../helpers/account';

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

function getVotedDelegates(address, options) {
  const params = {
    address: address,
    limit: options.limit,
    offset: options.offset,
  };
  getApi().get('/api/accounts/getVotes', params, function(err, result) {
    console.log(err || result);
  });
}

async function genPubkey() {
  const result: any = await inquirer.prompt([
    {
      type: 'password',
      name: 'secret',
      message: 'Enter secret of your testnet account',
    },
  ]);
  const account = accountHelper.account(result.secret.trim());
  console.log('Public key: ' + account.keypair.publicKey);
  console.log('Address: ' + account.address);
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
    .command('getvoteddelegates [address]')
    .description('get delegates voted by address')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getVotedDelegates);

  program
    .command('crypto')
    .description('crypto operations')
    .option('-p, --pubkey', 'generate public key from secret')
    .option('-g, --generate', 'generate random accounts')
    .action(function(options) {
      (async function() {
        try {
          if (options.pubkey) {
            genPubkey();
          } else if (options.generate) {
            genAccount();
          } else {
            console.log("'node crypto -h' to get help");
          }
        } catch (e) {
          console.log(e);
        }
      })();
    });
}
