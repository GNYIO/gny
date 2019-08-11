import * as fs from 'fs';
import * as crypto from 'crypto';

import * as gnyJS from '@gny/gny-js';
import Api from '../helpers/api';
import * as blockHelper from '../helpers/block';
import * as cryptoLib from '../lib/crypto';

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
}
