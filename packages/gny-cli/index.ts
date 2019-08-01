#!/usr/bin/env node

import * as program from 'commander';

import api from './plugins/api';
import chain from './plugins/chain';
import contract from './plugins/contract';
import crypto from './plugins/crypto';
import misc from './plugins/misc';

const plugins = [api, chain, contract, crypto, misc];

const packageJson = require('./package.json');

function main() {
  const defaultHost = process.env.GNY_HOST || '127.0.0.1';
  const defaultPort = process.env.GNY_PORT || 4096;
  program
    .version(packageJson.version)
    .option(
      '-H, --host <host>',
      'Specify the hostname or ip of the node, default: ' + defaultHost,
      defaultHost
    )
    .option(
      '-P, --port <port>',
      'Specify the port of the node, default: ' + defaultPort,
      defaultPort
    )
    .option('-M, --main', 'Specify the mainnet, default: false');

  plugins.forEach(function(el) {
    el(program);
  });

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
  program.parse(process.argv);
}

main();
