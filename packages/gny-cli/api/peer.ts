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

function getPeers() {
  getApi().get('/api/peers/', function(err, result) {
    console.log(err || pretty(result.peers));
  });
}

export default function account(program) {
  globalOptions = program;

  program
    .command('getpeers')
    .description('get peers')
    .action(getPeers);
}
