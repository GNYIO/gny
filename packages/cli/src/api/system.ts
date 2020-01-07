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

function getSystemInfo() {
  getApi().get('/api/system/', function(err, result) {
    console.log(err || pretty(result.peers));
  });
}

export default function system(program: ApiConfig) {
  globalOptions = program;

  program
    .command('getsysteminfo')
    .description('get system information')
    .action(getSystemInfo);
}
