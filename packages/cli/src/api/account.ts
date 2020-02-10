import { Api, ApiConfig } from '../lib/api';
import { AddressOrUsername } from '@gny/interfaces';

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
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getBalance(address: string) {
  const params = { address: address };
  getApi().get('/api/accounts/getBalance', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getAccountByAddress(address: string) {
  const params = { address: address };
  getApi().get('/api/accounts/', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getAccountByUsername(username: string) {
  const params = { username: username };
  getApi().get('/api/accounts/', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getAddressCurrencyBalance(options) {
  getApi().get(`/api/accounts/${options.address}/${options.currency}`, function(
    err,
    result
  ) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getVotedDelegates(options: AddressOrUsername) {
  getApi().get('/api/accounts/getVotes', options, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function countAccounts() {
  getApi().get('/api/accounts/count', function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

async function getPublicKey(address: string) {
  const params = {
    address: address,
  };
  getApi().get('/api/accounts/getPublicKey', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

export default function account(program: ApiConfig) {
  globalOptions = program;

  program
    .command('openaccount <publicKey>')
    .description('open your account and get the infomation by publicKey')
    .action(openAccount);

  program
    .command('getbalance <address>')
    .description('get balance by address')
    .action(getBalance);

  program
    .command('getaccountbyaddress <address>')
    .description('get account by address')
    .action(getAccountByAddress);

  program
    .command('getaccountbyusername <username>')
    .description('get account by username')
    .action(getAccountByUsername);

  program
    .command('countaccounts')
    .description('get the number of accounts')
    .action(countAccounts);

  program
    .command('getbalancebyaddresscurrency')
    .description('get balance by address and currency')
    .requiredOption('-a, --address <address>', '')
    .requiredOption('-c, --currency <currency>', '')
    .action(getAddressCurrencyBalance);

  program
    .command('getvoteddelegates')
    .description('get delegates voted by address')
    .option('-u, --username <username>', '')
    .option('-a, --address <address>', '')
    .action(getVotedDelegates);

  program
    .command('getpublickey <address>')
    .description('get public key by address')
    .action(getPublicKey);
}
