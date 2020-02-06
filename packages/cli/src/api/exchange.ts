import * as inquirer from 'inquirer';
import { Api, ApiConfig } from '../lib/api';
import { generateSecret } from '../helpers';
import * as accountHelper from '../lib/account';
import { generateKeyPair } from '@gny/ed';
import * as crypto from 'crypto';

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

// TODO: addTransactionUnsigned

function openAccountWithSecret(secret: string) {
  getApi().post('/api/exchange/openAccount', { secret: secret }, function(
    err,
    result
  ) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result));
    }
  });
}

function genPublicKey(secret: string) {
  const hash = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keys = generateKeyPair(hash);
  console.log(keys.publicKey.toString('hex'));
}

async function genAccount() {
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
  globalOptions = program;

  program
    .command('openaccountwithsecret [secret]')
    .description('open your account and get the infomation by secret')
    .action(openAccountWithSecret);

  program
    .command('genpublickey [secret]')
    .description('generate public key by secret')
    .action(genPublicKey);

  program
    .command('getpublickey [secret]')
    .description('get public key by secret')
    .action(genPublicKey);

  program
    .command('genaccount')
    .description('generate accounts')
    .action(genAccount);
}
