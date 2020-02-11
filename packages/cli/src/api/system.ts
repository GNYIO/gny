import { ApiConfig } from '../lib/api';
import Api from '../lib/api';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function getSystemInfo() {
  await Api.get(baseUrl + '/api/system/');
}

export default function system(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('getsysteminfo')
    .description('get system information')
    .action(getSystemInfo);
}
