import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { getBaseUrl } from '../getBaseUrl';

export async function getSystemInfo() {
  await Api.get(getBaseUrl() + '/api/system/');
}

export default function system(program: ApiConfig) {
  program
    .command('getsysteminfo')
    .description('get system information')
    .action(getSystemInfo);
}
