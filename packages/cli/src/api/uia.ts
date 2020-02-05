import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { TransactionBase } from '@gny/base';
import { Api, ApiConfig } from '../lib/api';
import { ITransaction, KeyPair } from '@gny/interfaces';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function getIssuers(options) {
  const param = {
    limit: options.limit,
    offest: options.offset,
  };
  getApi().get('/api/uia/issuers', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function isIssuer(address: string) {
  const param = {
    address: address,
  };
  getApi().get('/api/uia/isIssuer', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function getIssuer(name: string) {
  const param = {
    name: name,
  };
  getApi().get('/api/uia/issuers', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function getIssuerAssets(name: string) {
  getApi().get(`/api/uia/issuers/${name}/assets`, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function getAssets(options) {
  const param = {
    limit: options.limit,
    offest: options.offset,
  };
  getApi().get('/api/uia/assets', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function getAsset(name: string) {
  const param = {
    name: name,
  };
  getApi().get('/api/uia/assets', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function getBalances(address: string) {
  const param = {
    address: address,
  };
  getApi().get('/api/uia/balances', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function getBalance(options) {
  const param = {
    address: options.address,
    currency: options.currency,
  };
  getApi().get('/api/uia/balances', param, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.account));
    }
  });
}

function sendAsset(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  const secondKeypair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(options.secondSecret, 'utf8')
      .digest()
  );
  const trs = TransactionBase.create({
    type: 103,
    fee: String(10000000),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.currency, options.amount, options.recipient],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.transactionId));
    }
  });
}

function registerDelegate(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);
  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }
  const trs = TransactionBase.create({
    type: 10,
    fee: String(100 * 1e8),
    message: options.message,
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [],
  });
  getApi().broadcastTransaction(trs, function(err, result) {
    if (err) {
      console.log(err);
      process.exit(1);
    } else {
      console.log(pretty(result.transactionId));
    }
  });
}

export default function uia(program: ApiConfig) {
  globalOptions = program;

  program
    .command('getissuers')
    .description('get issuers')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getIssuers);

  program
    .command('isissuer [address]')
    .description('check if is an issuer by address')
    .action(isIssuer);

  program
    .command('getissuer [name]')
    .description('get issuer by name')
    .action(getIssuer);

  program
    .command('getissuerassets [name]')
    .description('get issuer assets by name')
    .action(getIssuerAssets);

  program
    .command('getassets')
    .description('get assets')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getAssets);

  program
    .command('getasset [name]')
    .description('get asset by name')
    .action(getAsset);

  program
    .command('getbalances [address]')
    .description('get balances by address')
    .action(getBalances);

  program
    .command('getbalancebycurrency')
    .description('get balance by address and currency')
    .option('-a, --address <address>', '')
    .option('-c, --currency <currency>', '')
    .action(getBalance);

  program
    .command('sendasset')
    .description('send asset to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-c, --currency <currency>', '')
    .option('-a, --amount <amount>', '')
    .option('-r, --recipient <address>', '')
    .option('-m, --message <message>', '')
    .action(sendAsset);

  program
    .command('registerdelegate')
    .description('register delegate')
    .option('--secret <secret>')
    .option('--username <username>')
    .option('--secondSecret [secret]')
    .action(registerDelegate);
}
