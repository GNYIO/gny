import Api from '../lib/api';

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

function getVoters(username) {
  const params = { username: username };
  getApi().get('/api/delegates/getVoters', params, function(err, result) {
    console.log(err || pretty(result.accounts));
  });
}

function getDelegateByPublicKey(publicKey) {
  const params = { publicKey: publicKey };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByUsername(username) {
  const params = { username: username };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByAddress(address) {
  const params = { address: address };
  getApi().get('/api/delegates/get', params, function(err, result) {
    console.log(err || pretty(result.delegate));
  });
}

export default function account(program) {
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
}
