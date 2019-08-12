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

function getPeers(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    state: options.state,
    os: options.os,
    port: options.port,
    version: options.version,
  };
  // var liskOptions = {host:'login.lisk.io', port:80};
  getApi().get('/api/peers/', params, function(err, result) {
    console.log(err || pretty(result.peers));
  });
}

export default function account(program) {
  globalOptions = program;

  program
    .command('getpeers')
    .description('get peers')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-t, --state <n>', ' 0 ~ 3')
    .option('-s, --sort <field:mode>', '')
    .option('-v, --version <version>', '')
    .option('-p, --port <n>', '')
    .option('--os <os>', '')
    .action(getPeers);
}
