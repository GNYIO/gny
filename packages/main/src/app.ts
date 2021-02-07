import * as program from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger, LogLevel } from '@gny/logger';
import { initTracer } from '@gny/tracer';

import Application from './index';
import * as packageJson from '../package.json';
import { IConfig, IBlock } from '@gny/interfaces';
import * as ip from 'ip';
import { P2P_VERSION } from '@gny/p2p';
import { getConfig } from '@gny/network';

const version = packageJson.version;

function main() {
  process.stdin.resume();

  program
    .version(version)
    .option('--config <path>', 'Config file path')
    .option('--port <port>', 'Listening port number')
    .option('--address <ip>', 'Listening host name or ip')
    .option('--genesisblock <path>', 'Genesisblock path')
    .option('--peers [peers...]', 'Peers list')
    .option('--log <level>', 'Log level: log|trace|debug|info|warn|error|fatal')
    .option('--base <dir>', 'Base directory')
    .option(
      '--privateP2PKey <key>',
      'Private P2P Key (base64 encoded) - overrides p2p_key.json file'
    )
    .option('--secret [secret...]', 'comma separated secrets')
    .option('--publicIP <ip>', 'Public IP of own server, default private IP')
    .option('--network <network>', 'Must be: localnet | testnet | mainnet')
    .option(
      '--nodeAction <action>',
      'Must be: forging | rollback:height, default forging'
    )
    .option('--dbPassword <password>')
    .option('--dbDatabase <database>')
    .option('--dbUser <user>')
    .option('--dbHost <host>')
    .option('--dbPort <port>')
    .on('--help', () => {
      console.log(`\nEnvironment Variables:
  GNY_NETWORK=<network>       Must be: localnet | testnet | mainnet
  GNY_PORT=<port>             Listening port number
  GNY_LOG_LEVEL=<level>       log|trace|debug|info|warn|error|fatal
  GNY_P2P_SECRET=<key>        Private P2P Key (base64 encoded) - overrides p2p_key.json file
  GNY_SECRET=[secret...]      comma separated secrets
  GNY_PUBLIC_IP=<ip>          Public IP of own server, default private IP
  GNY_P2P_PEERS=[peers...]    comma separated peers
  GNY_ADDRESS=<address>       Listening host name or ip
  GNY_NODE_ACTION=<action>         Must be: forging | rollback:height, default forging
  GNY_DB_PASSWORD=<password>  db password
  GNY_DB_DATABASE=<database>  db name
  GNY_DB_USER=<user>          db user
  GNY_DB_HOST=<host>          db host
  GNY_DB_PORT=<port>          db port
      `);
    })
    .parse(process.argv);

  const baseDir = program.base || process.cwd();

  // default config.json path
  let appConfigFile = path.join(baseDir, 'config.json');
  // config.json path can be overriden
  if (program.config) {
    appConfigFile = path.resolve(process.cwd(), program.config);
  }
  const appConfig: IConfig = JSON.parse(fs.readFileSync(appConfigFile, 'utf8'));

  const pidFile = appConfig.pidFile || path.join(baseDir, 'GNY.pid');
  if (fs.existsSync(pidFile)) {
    console.log('Error: Server has already started.');
    return;
  }

  appConfig.version = version;
  appConfig.baseDir = baseDir;
  appConfig.buildVersion = String(new Date());

  appConfig.netVersion = program.network || process.env['GNY_NETWORK'];

  // either custom genesisBlock or
  let genesisBlock: IBlock = null;
  if (program.genesisblock) {
    genesisBlock = JSON.parse(path.resolve(baseDir, program.genesisblock));
    // magic must be set in config.json file
  } else {
    // genesisBlock.(localnet | testnet | mainnet).json
    const network = getConfig(appConfig.netVersion);
    genesisBlock = network.genesisBlock;
    appConfig.magic = network.hash;
  }

  // port, default 4096
  appConfig.port = program.port || process.env['GNY_PORT'] || 4096;
  appConfig.port = Number(appConfig.port);

  // peerPort
  appConfig.peerPort = appConfig.port + 1;

  if (program.address || process.env['GNY_ADDRESS']) {
    appConfig.address = program.address || process.env['GNY_ADDRESS'];
  }

  if (program.peers || process.env['GNY_P2P_PEERS']) {
    const peers = program.peers || process.env['GNY_P2P_PEERS'];
    appConfig.peers.bootstrap = peers.split(',');
  }

  // loglevel, default info
  appConfig.logLevel = program.log || process.env['GNY_LOG_LEVEL'] || 'info';

  if (program.dbPassword || process.env['GNY_DB_PASSWORD']) {
    appConfig.dbPassword = program.dbPassword || process.env['GNY_DB_PASSWORD'];
  }

  if (program.dbDatabase || process.env['GNY_DB_DATABASE']) {
    appConfig.dbDatabase = program.dbDatabase || process.env['GNY_DB_DATABASE'];
  }

  if (program.dbUser || process.env['GNY_DB_USER']) {
    appConfig.dbUser = program.dbUser || process.env['GNY_DB_USER'];
  }

  appConfig.dbHost = 'localhost'; // default
  if (program.dbHost || process.env['GNY_DB_HOST']) {
    appConfig.dbHost = program.dbHost || process.env['GNY_DB_HOST'];
  }

  appConfig.dbPort = 3000; // default
  if (program.dbPort || process.env['GNY_DB_PORT']) {
    appConfig.dbPort = Number(program.dbPort || process.env['GNY_DB_PORT']);
  }

  if (program.privateP2PKey || process.env['GNY_P2P_SECRET']) {
    appConfig.peers.privateP2PKey =
      program.privateP2PKey || process.env['GNY_P2P_SECRET'];
  } else {
    console.error(`--privateP2PKey="" or GNY_P2P_SECRET="" are mandatory`);
    process.exit(1);
  }

  if (program.secret || process.env['GNY_SECRET']) {
    const userSecret = program.secret || process.env['GNY_SECRET'];
    appConfig.forging.secret = userSecret.split(',');
  }

  if (program.publicIp || process.env['GNY_PUBLIC_IP']) {
    appConfig.publicIp = program.publicIP || process.env['GNY_PUBLIC_IP'];
  } else {
    appConfig.publicIp = ip.address();
  }

  // distributed tracing endpoint
  appConfig.jaegerHost =
    program.jaegerHost ||
    process.env['GNY_JAEGER_HOST'] ||
    'http://135.181.46.217:14268/api/traces';
  // centralized logging endpoint
  appConfig.lokiHost =
    process.env['GNY_LOKI_HOST'] || 'https://testnet.loki.gny.io';

  const logger = createLogger(
    LogLevel[appConfig.logLevel],
    appConfig.lokiHost,
    appConfig.publicIp,
    appConfig.version,
    appConfig.netVersion
  );

  // tracer
  const tracer = initTracer(
    appConfig.publicIp,
    appConfig.jaegerHost,
    version,
    appConfig.magic,
    appConfig.netVersion,
    P2P_VERSION,
    logger
  );

  // action: default "forging"
  appConfig.nodeAction =
    program.nodeAction || process.env['GNY_NODE_ACTION'] || 'forging';

  // asign config to global variable
  global.Config = appConfig;

  const options = {
    appConfig,
    genesisBlock,
    logger,
    tracer,
  };

  const application = new Application(options);
  (async () => {
    try {
      await application.run();
    } catch (e) {
      console.log(e);
    }
  })();
}

main();
