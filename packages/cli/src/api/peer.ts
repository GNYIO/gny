import { Api, ApiConfig } from '../lib/api';

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

function getPeers() {
  getApi().get('/api/peers/', function(err, result) {
    console.log(err || pretty(result.peers));
  });
}

function getVersion() {
  getApi().get('/api/peers/version', function(err, result) {
    console.log(err || pretty(result.peers));
  });
}

export default function account(program: ApiConfig) {
  globalOptions = program;

  program
    .command('getpeers')
    .description('get peers')
    .action(getPeers);

  program
    .command('getversion')
    .description('get version')
    .action(getVersion);
}
