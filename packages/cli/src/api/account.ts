import { ApiConfig, http } from '../lib/api';
import { AddressOrUsername } from '@gny/interfaces';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export async function openAccount(publicKey: string) {
  const { data } = await http.post(baseUrl + '/api/accounts/openAccount', {
    publicKey: publicKey,
  });
  console.log(pretty(data));
}

export async function getBalance(address: string) {
  const params = { address: address };
  try {
    const { data } = await http.get(baseUrl + '/api/accounts/getBalance', {
      params: params,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function getAccountByAddress(address: string) {
  const params = { address: address };
  try {
    const { data } = await http.get(baseUrl + '/api/accounts/', {
      params: params,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function getAccountByUsername(username: string) {
  const params = { username: username };

  try {
    const { data } = await http.get(baseUrl + '/api/accounts/', {
      params: params,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function getAddressCurrencyBalance(options) {
  try {
    const { data } = await http.get(
      baseUrl + `/api/accounts/${options.address}/${options.currency}`
    );
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function getVotedDelegates(options: AddressOrUsername) {
  try {
    const { data } = await http.get(baseUrl + `/api/accounts/getVotes`, {
      params: options,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function countAccounts() {
  try {
    const { data } = await http.get(baseUrl + `/api/accounts/count`);
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
}

export async function getPublicKey(address: string) {
  const params = {
    address: address,
  };
  try {
    const { data } = await http.get(baseUrl + '/api/accounts/getPublicKey', {
      params: params,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response.data);
  }
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
