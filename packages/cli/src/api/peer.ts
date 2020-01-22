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
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function getVersion() {
  getApi().get('/api/peers/version', function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

export default function peer(program: ApiConfig) {
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
