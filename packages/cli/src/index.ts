#!/usr/bin/env node

import * as program from 'commander';

import account from './api/account';
import basic from './api/basic';
import block from './api/block';
import delegate from './api/delegate';
import peer from './api/peer';
import transaction from './api/transaction';
import vote from './api/vote';

import newGenesisBlock from './lib/newGenesisBlock';
import { ApiConfig } from './lib/api';

const api = [account, basic, block, delegate, peer, transaction, vote];

const lib = [newGenesisBlock];

function main() {
  const defaultHost = process.env.GNY_HOST || '127.0.0.1';
  const defaultPort = process.env.GNY_PORT || 4096;
  program
    .option(
      '-H, --host <host>',
      `Specify the hostname or ip of the node, default: ${defaultHost}`,
      defaultHost
    )
    .option(
      '-P, --port <port>',
      `Specify the port of the node, default: ${defaultPort}`,
      defaultPort
    )
    .option('-M, --main', 'Specify the mainnet, default: false');

  api.forEach(one => one(program as ApiConfig));
  lib.forEach(one => one(program));

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
  program.parse(process.argv);
}

main();
