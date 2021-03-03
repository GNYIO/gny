import * as inquirer from 'inquirer';
import { ApiConfig, pretty } from '../lib/api';
import Api from '../lib/api';
import { generateSecret } from '../helpers';
import * as accountHelper from '../lib/account';
import { generateKeyPair } from '@gny/web-ed';
import * as crypto from 'crypto';
import { getBaseUrl } from '../getBaseUrl';

// TODO: addTransactionUnsigned

export async function openAccountWithSecret(secret: string) {
  await Api.post(getBaseUrl() + '/api/exchange/openAccount', {
    secret: secret,
  });
}

export function genPublicKey(secret: string) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keys = generateKeyPair(hash);
  console.log(keys.publicKey.toString('hex'));
}

export async function genAccount() {
  const result: any = await inquirer.prompt([
    {
      type: 'input',
      name: 'amount',
      message: 'Enter number of accounts to generate',
    },
  ]);
  const n = parseInt(result.amount);
  const accounts = [];

  for (let i = 0; i < n; i++) {
    const one = accountHelper.account(generateSecret());
    accounts.push({
      address: one.address,
      secret: one.secret,
      publicKey: one.keypair.publicKey.toString('hex'),
    });
  }
  console.log(pretty(accounts));
  console.log('Done');
}

export default function exchange(program: ApiConfig) {
  program
    .command('openaccountwithsecret <secret>')
    .description('open your account and get the infomation by secret')
    .action(openAccountWithSecret);

  program
    .command('genpublickey <secret>')
    .description('generate public key by secret')
    .action(genPublicKey);

  program
    .command('getpublickeybysecret [secret]')
    .description('get public key by secret')
    .action(genPublicKey);

  program
    .command('genaccount')
    .description('generate accounts')
    .action(genAccount);
}
