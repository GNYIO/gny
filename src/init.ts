import fs = require('fs');
import path = require('path');
import os = require('os');
import { EventEmitter } from 'events';
import http = require('http')
import https = require('https');
import socketio = require('socket.io');
import ZSchema = require('z-schema');
import ip = require('ip');
import express = require('express');
import compression = require('compression');
import cors = require('cors');
import _ = require('lodash');
import bodyParser = require('body-parser');
import methodOverride = require('method-override');
import Sequence = require('./utils/sequence');
import slots = require('./utils/slots');
import queryParser = require('./utils/express-query-int');
import ZSchemaExpress = require('./utils/zscheme-express');
import Transaction = require('./base/transaction');
import Block = require('./base/block');
import Consensus = require('./base/consensus');
import protobuf = require('./utils/protobuf');
import { Round } from './core/round';
import { Server } from './core/server';

// no chain module
const moduleNames = [
  'server',
  'accounts',
  'transactions',
  'loader',
  'system',
  'peer',
  'transport',
  'delegates',
  'round',
  'uia',
  'blocks',
];

const CIPHERS = `
  ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:
  ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:
  ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:
  DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:
  !aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA`;

function getPublicIp() {
  let publicIp;
  try {
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach((ifname) => {
      ifaces[ifname].forEach((iface) => {
        if (iface.family !== 'IPv4' || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }
        if (!ip.isPrivate(iface.address)) {
          publicIp = iface.address;
        }
      });
    });
  } catch (e) {
    throw e;
  }
  return publicIp;
}

function isNumberOrNumberString(value) {
  return !(Number.isNaN(value) || Number.isNaN(parseInt(value, 10))
    || String(parseInt(value, 10)) !== String(value))
}
const modules = [];


async function init_alt(options: any) {
  let scope = {};
  const { appConfig, genesisblock } = options;

  if (!appConfig.publicIp) {
    appConfig.publicIp = getPublicIp();
  }

  const protoFile = path.join(__dirname, '..', 'proto', 'index.proto');
  if (!fs.existsSync(protoFile)) {
    console.log('Error: Proto file doesn\'t exist!');
    return;
  }
  scope.protobuf = protobuf.protobufAlt(protoFile);

  scope.config = appConfig;
  scope.logger = options.logger;
  scope.genesisblock = {
    block: genesisblock,
  };
  // scope.protobuf =

  scope.scheme = scheme();
  scope.network = await network(options);
  scope.dbSequence = dbSequence(options);
  scope.sequence = sequence(options);
  scope.balancesSequence = balancesSequence(options);

  {
    const PAYLOAD_LIMIT_SIZE = '8mb';
    scope.network.app.engine('html', require('ejs').renderFile);
    scope.network.app.set('view engine', 'ejs');
    scope.network.app.set('views', scope.config.publicDir);
    scope.network.app.use(scope.network.express.static(scope.config.publicDir));
    scope.network.app.use(bodyParser.raw({ limit: PAYLOAD_LIMIT_SIZE }));
    scope.network.app.use(bodyParser.urlencoded({
      extended: true,
      limit: PAYLOAD_LIMIT_SIZE,
      parameterLimit: 5000,
    }));
    scope.network.app.use(bodyParser.json({ limit: PAYLOAD_LIMIT_SIZE }));
    scope.network.app.use(methodOverride());

    const ignore = [
      'id', 'name', 'lastBlockId', 'blockId',
      'transactionId', 'address', 'recipientId',
      'senderId', 'previousBlock',
    ];

    scope.network.app.use(queryParser({
      parser(value, radix, name) {
        if (ignore.indexOf(name) >= 0) {
          return value;
        }

        if (!isNumberOrNumberString(value)) {
          return value;
        }

        return Number.parseInt(value, radix);
      },
    }));

    scope.network.app.use(ZSchemaExpress(scope.scheme));
    scope.network.app.use((req, res, next) => {
      const parts = req.url.split('/');
      const host = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      scope.logger.debug(`receive request: ${req.method} ${req.url} from ${host}`);

      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', 'frame-ancestors \'none\'');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, Content-Length,  X-Requested-With, Content-Type, Accept, request-node-status',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT, DELETE');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        scope.logger.debug('Response pre-flight request');
        return;
      }

      const URI_PREFIXS = ['api', 'api2', 'peer'];
      const isApiOrPeer = parts.length > 1 && (URI_PREFIXS.indexOf(parts[1]) !== -1);
      const { whiteList } = scope.config.api.access;
      const { blackList } = scope.config.peers;

      const forbidden = isApiOrPeer && (
        (whiteList.length > 0 && whiteList.indexOf(ip) < 0)
        || (blackList.length > 0 && blackList.indexOf(ip) >= 0));

      if (isApiOrPeer && forbidden) {
        res.sendStatus(403);
      } else if (isApiOrPeer && req.headers['request-node-status'] === 'yes') {
        // Add server status info to response header
        const lastBlock = scope.modules.blocks.getLastBlock();
        res.setHeader('Access-Control-Expose-Headers', 'node-status');
        res.setHeader('node-status', JSON.stringify({
          blockHeight: lastBlock.height,
          blockTime: slots.getRealTime(lastBlock.timestamp),
          blocksBehind: slots.getNextSlot() - (slots.getSlotNumber(lastBlock.timestamp) + 1),
          version: scope.modules.peer.getVersion(),
        }));
        next();
      } else {
        next();
      }
    });

    scope.network.server.listen(5098, scope.config.address, (err) => {
      scope.logger.log(`Server started: ${scope.config.address}:${scope.config.port}`);
      if (!err) {
        scope.logger.log(`Error: ${err}`);
      }
    })
    scope.connect = scope.network;
  }

  scope.base = {};
  scope.base.bus = scope.bus;
  scope.base.scheme = scope.scheme;
  scope.base.genesisblock = scope.genesisblock;
  scope.base.consensus = new Consensus(scope);
  scope.base.transaction = new Transaction(scope);
  scope.base.block = new Block(scope);

  global.library = scope;


  // const server = new Server(scope);
  // console.log('20181002', server);
  function cb(err, result) {
    if (err) return console.log(err);
    // console.log(result);
  }
  scope.modules = {};

  moduleNames.forEach(name => {
    let obj;
    scope.logger.debug('Loading Module...', name);
    // import * as Klass from `./core-alt/${name}`;
    const Klass = require(`./core/${name}`);
    console.log(`${name}  ${Klass}`)
    obj = new Klass.default(cb, scope);
    modules.push(obj);
    scope.modules[name] = obj;
  });

  class Bus extends EventEmitter {
    message(topic, ...restArgs) {
      modules.forEach((module) => {
        const eventName = `on${_.chain(topic).camelCase().upperFirst().value()}`;
        if (typeof (module[eventName]) === 'function') {
          module[eventName].apply(module[eventName], [...restArgs]);
        }
      })
      this.emit(topic, ...restArgs);
    }
  }
  scope.bus = new Bus();
  return scope;
}



function scheme() {
  ZSchema.registerFormat('hex', (str) => {
    let b
    try {
      b = Buffer.from(str, 'hex')
    } catch (e) {
      return false
    }

    return b && b.length > 0
  })

  ZSchema.registerFormat('publicKey', (str) => {
    if (str.length === 0) {
      return true
    }

    try {
      const publicKey = Buffer.from(str, 'hex')

      return publicKey.length === 32
    } catch (e) {
      return false
    }
  })

  ZSchema.registerFormat('splitarray', (str) => {
    try {
      const a = str.split(',')
      return a.length > 0 && a.length <= 1000
    } catch (e) {
      return false
    }
  })

  ZSchema.registerFormat('signature', (str) => {
    if (str.length === 0) {
      return true
    }

    try {
      const signature = Buffer.from(str, 'hex')
      return signature.length === 64
    } catch (e) {
      return false
    }
  })

  ZSchema.registerFormat('checkInt', value => !isNumberOrNumberString(value))

  return new ZSchema();
}

function network(options: any) {
  let sslServer;
  let sslio;

  const app = express();

  app.use(compression({ level: 6 }));
  app.use(cors());
  app.options('*', cors());

  const server = http.createServer(app);
  const io = socketio(server);

  if (options.appConfig.ssl.enabled) {
    const privateKey = fs.readFileSync(options.appConfig.ssl.options.key);
    const certificate = fs.readFileSync(options.config.ssl.options.cert);

    sslServer = https.createServer({
      key: privateKey,
      cert: certificate,
      ciphers: CIPHERS,
    }, app);
    sslio = socketio(sslServer);
  }

  return {
    express,
    app,
    server,
    io,
    sslServer,
    sslio,
  };
}

function dbSequence(options: any) {
  return new Sequence({
    name: 'db',
    onWarning: (current: any) => {
      options.logger.warn(`DB sequence ${current}`);
    },
  });
}

function sequence(options: any) {
  return new Sequence({
    name: 'normal',
    onWarning: (current: any) => {
      options.logger.warn(`Main sequence ${current}`);
    },
  });
}

function balancesSequence(options: any) {
  return new Sequence({
    name: 'balance',
    onWarning: (current: any) => {
      options.logger.warn(`Balance sequence ${current}`);
    },
  });
}

export = init_alt;