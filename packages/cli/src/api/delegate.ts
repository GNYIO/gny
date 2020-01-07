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
    console.log(err || pretty(result.delegates));
  });
}

function getDelegatesCount() {
  getApi().get('/api/delegates/count', function(err, result) {
    console.log(err || result.count);
  });
}

function getVoters(username: string) {
  const params = { username: username };
  getApi().get('/api/delegates/getVoters', params, function(err, result) {
    console.log(err || pretty(result.accounts));
  });
}

function getDelegateByPublicKey(publicKey: String) {
  const params = { publicKey: publicKey };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByUsername(username: String) {
  const params = { username: username };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByAddress(address: String) {
  const params = { address: address };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function listDiffVotes(options) {
  const params = {
    username: options.username,
    publicKey: options.publicKey,
    address: options.address,
  };
  getApi().get('/api/delegates/get', params, function(err, result) {
    const username = result.delegate.username;
    const params = {
      address: result.delegate.address,
      username: result.delegate.username,
    };
    getApi().get('/api/accounts/getVotes', params, function(err, result) {
      const names_a = result.delegates.map(delegate => delegate.username);
      const a = new Set(names_a);
      const params = { username: username };
      getApi().get('/api/delegates/getVoters', params, function(err, result) {
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
    .command('getvoters [username]')
    .description('get voters of a delegate by username')
    .action(getVoters);

  program
    .command('getdelegatebypublickey [publicKey]')
    .description('get delegate by public key')
    .action(getDelegateByPublicKey);

  program
    .command('getdelegatebyusername [username]')
    .description('get delegate by username')
    .action(getDelegateByUsername);

  program
    .command('getdelegatebyaddress [address]')
    .description('get delegate by address')
    .action(getDelegateByAddress);

  program
    .command('listdiffvotes')
    .description('list the votes by each other')
    .option('-u, --username <username>', '')
    .option('-p, --publicKey <publicKey>', '')
    .option('-a, --address <address>', '')
    .action(listDiffVotes);
}
