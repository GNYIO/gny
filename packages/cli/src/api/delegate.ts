import { ApiConfig } from '../lib/api';
import Api from '../lib/api';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function getDelegates(options) {
  const params = {
    limit: options.limit,
    offset: options.offset,
  };
  await Api.get(baseUrl + '/api/delegates/', params);
}

export async function getDelegatesCount() {
  await Api.get(baseUrl + '/api/delegates/count');
}

export async function getVoters(username: string) {
  const params = { username: username };
  await Api.get(baseUrl + '/api/delegates/getVoters', params);
}

export async function getDelegateByPublicKey(publicKey: String) {
  const params = { publicKey: publicKey };
  await Api.get(baseUrl + '/api/delegates/get', params);
}

export async function getDelegateByUsername(username: String) {
  const params = { username: username };
  await Api.get(baseUrl + '/api/delegates/get', params);
}

export async function getDelegateByAddress(address: String) {
  const params = { address: address };
  await Api.get(baseUrl + '/api/delegates/get', params);
}

export default function delegate(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('getdelegates')
    .description('get delegates')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getDelegates);

  program
    .command('getdelegatescount')
    .description('get delegates count')
    .action(getDelegatesCount);

  program
    .command('getvoters <username>')
    .description('get voters of a delegate by username')
    .action(getVoters);

  program
    .command('getdelegatebypublickey <publicKey>')
    .description('get delegate by public key')
    .action(getDelegateByPublicKey);

  program
    .command('getdelegatebyusername <username>')
    .description('get delegate by username')
    .action(getDelegateByUsername);

  program
    .command('getdelegatebyaddress <address>')
    .description('get delegate by address')
    .action(getDelegateByAddress);
}
