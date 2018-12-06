import program from 'commander'
import path = require('path');
import fs = require('fs');
import ip = require('ip');
import daemon = require('daemon');
import tracer = require('tracer');
import Application from './index';
import * as packageJson from './package.json';

const version = packageJson.version;

function main() {

  const baseDir = program.base || './';
  const seedPort = 81;
  const seeds = [
    757137132
  ];
  let appConfigFile;
  let genesisBlockFile;
  let logger;

  process.stdin.resume();

  program
    .version(version)
    .option('-c, --config <path>', 'Config file path')
    .option('-p, --port <port>', 'Listening port number')
    .option('-a, --address <ip>', 'Listening host name or ip')
    .option('-g, --genesisblock <path>', 'Genesisblock path')
    .option('-x, --peers [peers...]', 'Peers list')
    .option('-l, --log <level>', 'Log level')
    .option('-d, --daemon', 'Run asch node as daemon')
    .option('--app <dir>', 'App directory')
    .option('--base <dir>', 'Base directory')
    .option('--data <dir>', 'Data directory')
    .parse(process.argv);

  if (program.config) {
    appConfigFile = path.resolve(process.cwd(), program.config);
  } else {
    appConfigFile = path.join(baseDir, 'config.json');
  }

  const appConfig = JSON.parse(fs.readFileSync(appConfigFile, 'utf8'));

  const pidFile = appConfig.pidFile || path.join(baseDir, 'aschd.pid');

  if (fs.existsSync(pidFile)) {
    console.log('Error: Server has already started.');
    return;
  }

  appConfig.version = version;
  appConfig.baseDir = baseDir;
  appConfig.dataDir = program.data || path.resolve(baseDir, 'data');
  appConfig.appDir = program.app || path.resolve(baseDir, 'src');
  appConfig.buildVersion = 'DEFAULT_BUILD_TIME';
  appConfig.netVersion = process.env.NET_VERSION || 'testnet';
  appConfig.publicDir = path.join(baseDir, 'public', 'dist');

  global.Config = appConfig;

  if (program.genesisblock) {
    genesisBlockFile = path.resolve(process.cwd(), program.genesisblock);
  } else {
    genesisBlockFile = path.join(baseDir, 'genesisBlock.json');
  }

  const genesisBlock = JSON.parse(fs.readFileSync(genesisBlockFile, 'utf8'));

  if (program.port) {
    appConfig.port = program.port;
  }
  appConfig.peerPort = appConfig.port + 1;

  if (program.address) {
    appConfig.address = program.address;
  }
  if (program.peers) {
    if (typeof program.peers === 'string') {
      appConfig.peers.list = program.peers.split(',').map((peer: string) => {
        const parts = peer.split(':');
        return {
          ip: parts.shift(),
          port: parts.shift() || appConfig.port,
        };
      });
    } else {
      appConfig.peers.list = [];
    }
  }

  if (appConfig.netVersion === 'mainnet') {
    for (let i = 0; i < seeds.length; ++i) {
      appConfig.peers.list.push({ ip: ip.fromLong(seeds[i]), port: seedPort });
    }
  }

  if (program.log) {
    appConfig.logLevel = program.log;
  }

  if (program.daemon) {
    console.log('Server started as daemon...');
    daemon({ cwd: process.cwd() });
    fs.writeFileSync(pidFile, process.pid, 'utf8');
  }

  if (program.daemon) {
    logger = tracer.dailyfile({
      root: path.join(baseDir, 'logs'),
      maxLogFiles: 10,
      allLogsFileName: 'debug',
    });
  } else {
    logger = tracer.colorConsole();
  }
  tracer.setLevel(appConfig.logLevel);

  const options = {
    appConfig,
    genesisBlock,
    logger,
    pidFile,
  };

  const app = new Application(options);
  (async () => {
    try {
      await app.run();
    } catch (e) {
      console.log(e)
    }

  })();
}

main();
