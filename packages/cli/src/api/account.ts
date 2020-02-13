import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { AddressOrUsername } from '@gny/interfaces';
import { getBaseUrl } from '../getBaseUrl';

export async function openAccount(publicKey: string) {
  await Api.post(getBaseUrl() + '/api/accounts/openAccount', { publicKey });
}

export async function getBalance(address: string) {
  const params = { address: address };
  await Api.get(getBaseUrl() + '/api/accounts/getBalance', params);
}

export async function getAccountByAddress(address: string) {
  const params = { address: address };
  await Api.get(getBaseUrl() + '/api/accounts/', params);
}

export async function getAccountByUsername(username: string) {
  const params = { username: username };
  await Api.get(getBaseUrl() + '/api/accounts/', params);
}

export async function getAddressCurrencyBalance(options) {
  await Api.get(
    getBaseUrl + `/api/accounts/${options.address}/${options.currency}`
  );
}

export async function getVotedDelegates(options: AddressOrUsername) {
  await Api.get(getBaseUrl + '/api/accounts/getVotes', options);
}

export async function countAccounts() {
  await Api.get(getBaseUrl + '/api/accounts/count');
}

export async function getPublicKey(address: string) {
  const params = {
    address: address,
  };
  await Api.get(getBaseUrl + '/api/accounts/getPublicKey', params);
}

export default function account(program: ApiConfig) {
  program
    .command('openaccount <publicKey>')
    .description('open your account and get the infomation by publicKey')
    .action(openAccount);

  program
    .command('getbalance <address>')
    .description('get balance by address')
    .action(getBalance);

  program
    .command('getaccountbyaddress <address>')
    .description('get account by address')
    .action(getAccountByAddress);

  program
    .command('getaccountbyusername <username>')
    .description('get account by username')
    .action(getAccountByUsername);

  program
    .command('countaccounts')
    .description('get the number of accounts')
    .action(countAccounts);

  program
    .command('getbalancebyaddresscurrency')
    .description('get balance by address and currency')
    .requiredOption('-a, --address <address>', '')
    .requiredOption('-c, --currency <currency>', '')
    .action(getAddressCurrencyBalance);

  program
    .command('getvoteddelegates')
    .description('get delegates voted by address')
    .option('-u, --username <username>', '')
    .option('-a, --address <address>', '')
    .action(getVotedDelegates);

  program
    .command('getpublickey <address>')
    .description('get public key by address')
    .action(getPublicKey);
}
