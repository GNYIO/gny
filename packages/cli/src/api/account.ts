import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { AddressOrUsername } from '@gny/interfaces';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function openAccount(publicKey: string) {
  await Api.post(baseUrl + '/api/accounts/openAccount', { publicKey });
}

export async function getBalance(address: string) {
  const params = { address: address };
  await Api.get(baseUrl + '/api/accounts/getBalance', params);
}

export async function getAccountByAddress(address: string) {
  const params = { address: address };
  await Api.get(baseUrl + '/api/accounts/', params);
}

export async function getAccountByUsername(username: string) {
  const params = { username: username };
  await Api.get(baseUrl + '/api/accounts/', params);
}

export async function getAddressCurrencyBalance(options) {
  await Api.get(
    baseUrl + `/api/accounts/${options.address}/${options.currency}`
  );
}

export async function getVotedDelegates(options: AddressOrUsername) {
  await Api.get(baseUrl + '/api/accounts/getVotes', options);
}

export async function countAccounts() {
  await Api.get(baseUrl + '/api/accounts/count');
}

export async function getPublicKey(address: string) {
  const params = {
    address: address,
  };
  await Api.get(baseUrl + '/api/accounts/getPublicKey', params);
}

export default function account(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('openaccount [publicKey]')
    .description('open your account and get the infomation by publicKey')
    .action(openAccount);

  program
    .command('getbalance [address]')
    .description('get balance by address')
    .action(getBalance);

  program
    .command('getaccountbyaddress [address]')
    .description('get account by address')
    .action(getAccountByAddress);

  program
    .command('getaccountbyusername [username]')
    .description('get account by username')
    .action(getAccountByUsername);

  program
    .command('countaccounts')
    .description('get the number of accounts')
    .action(countAccounts);

  program
    .command('getbalancebyaddresscurrency')
    .description('get balance by address and currency')
    .option('-a, --address [address]', '')
    .option('-c, --currency [currency]', '')
    .action(getAddressCurrencyBalance);

  program
    .command('getvoteddelegates')
    .description('get delegates voted by address')
    .option('-u, --username [username]', '')
    .option('-a, --address [address]', '')
    .action(getVotedDelegates);

  program
    .command('getpublickey [address]')
    .description('get public key by address')
    .action(getPublicKey);
}
