import { ApiConfig } from '../lib/api';
import Api from '../lib/api';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function getPeers() {
  await Api.get(baseUrl + '/api/peers/');
}

export async function getVersion() {
  await Api.get(baseUrl + '/api/peers/version');
}

export async function getInfo() {
  await Api.get(baseUrl + '/api/peers/info');
}

export default function peer(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('getpeers')
    .description('get peers')
    .action(getPeers);

  program
    .command('getversion')
    .description('get version')
    .action(getVersion);

  program
    .command('getinfo')
    .description('get info')
    .action(getInfo);
}
