import { Api, ApiConfig } from '../lib/api';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function getDelegates(options) {
  const params = {
    limit: options.limit,
    offset: options.offset,
  };
  getApi().get('/api/delegates/', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getDelegatesCount() {
  getApi().get('/api/delegates/count', function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.count));
    }
  });
}

function getVoters(username: string) {
  const params = { username: username };
  getApi().get('/api/delegates/getVoters', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.accounts));
    }
  });
}

function getDelegateByPublicKey(publicKey: String) {
  const params = { publicKey: publicKey };
  getApi().get('/api/delegates/get', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.delegate));
    }
  });
}

function getDelegateByUsername(username: String) {
  const params = { username: username };
  getApi().get('/api/delegates/get', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.delegate));
    }
  });
}

function getDelegateByAddress(address: String) {
  const params = { address: address };
  getApi().get('/api/delegates/get', params, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.delegate));
    }
  });
}

export default function delegate(program: ApiConfig) {
  globalOptions = program;

  program
    .command('getdelegatescount')
    .description('get delegates count')
    .action(getDelegatesCount);

  program
    .command('getdelegates')
    .description('get delegates')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getDelegates);

  program
    .command('getvoters <username>')
    .description('get voters of a delegate by username')
    .action(getVoters);

  program
    .command('getdelegatebypublickey <publicKey>')
    .description('get delegate by public key')
    .action(getDelegateByPublicKey);

  program
    .command('getdelegatebyusername <username>')
    .description('get delegate by username')
    .action(getDelegateByUsername);

  program
    .command('getdelegatebyaddress <address>')
    .description('get delegate by address')
    .action(getDelegateByAddress);
}
