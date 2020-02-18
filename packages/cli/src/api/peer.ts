import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { getBaseUrl } from '../getBaseUrl';

export async function getPeers() {
  await Api.get(getBaseUrl() + '/api/peers/');
}

export async function getVersion() {
  await Api.get(getBaseUrl() + '/api/peers/version');
}

export async function getInfo() {
  await Api.get(getBaseUrl() + '/api/peers/info');
}

export default function peer(program: ApiConfig) {
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
