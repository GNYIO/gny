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
    orderBy: options.sort || 'rate:asc',
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

function getVoters(publicKey) {
  const params = { publicKey: publicKey };
  getApi().get('/api/delegates/voters', params, function(err, result) {
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
    .option('-s, --sort <field:mode>', 'rate:asc, vote:desc, ...')
    .action(getDelegates);

  program
    .command('getvoters [publicKey]')
    .description('get voters of a delegate by public key')
    .action(getVoters);

  program
    .command('getdelegatebypublickey [publicKey]')
    .description('get delegate by public key')
    .action(getDelegateByPublicKey);

  program
    .command('getdelegatebyusername [username]')
    .description('get delegate by username')
    .action(getDelegateByUsername);
}
