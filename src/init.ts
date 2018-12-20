import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import * as ZSchema from 'z-schema';
import * as ip from 'ip';
import * as _ from 'lodash';
import * as bodyParser from 'body-parser';
import * as methodOverride from 'method-override';
import Sequence from './utils/sequence';
import slots from './utils/slots';
import queryParser from './utils/express-query-int';
import ZSchemaExpress from './utils/zscheme-express';
import { Transaction } from './base/transaction';
import { Block } from './base/block';
import { Consensus } from './base/consensus';
import protobuf from './utils/protobuf';
import loadedModules from './loadModules';
import loadCoreApi from './loadCoreApi';
import initNetwork from './initNetwork';
import { IScope, IMessageEmitter } from './interfaces';


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
    || String(parseInt(value, 10)) !== String(value));
}

async function init_alt(options: any) {
  const scope: Partial<IScope> = {};
  const { appConfig, genesisBlock } = options;

  if (!appConfig.publicIp) {
    appConfig.publicIp = getPublicIp();
  }

  const protoFile = path.join(__dirname, '..', 'proto', 'index.proto');
  if (!fs.existsSync(protoFile)) {
    console.log('Error: Proto file doesn\'t exist!');
    return;
  }
  scope.protobuf = protobuf.getSchema(protoFile);

  scope.config = appConfig;
  scope.logger = options.logger;
  scope.genesisBlock = genesisBlock;

  scope.scheme = scheme();
  scope.network = await initNetwork(options);
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

      const URI_PREFIXS = ['api', 'peer'];
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

    scope.network.server.listen(scope.config.port, scope.config.address, (err) => {
      scope.logger.log(`Server started: ${scope.config.address}:${scope.config.port}`);
      if (!err) {
        scope.logger.log(`Error: ${err}`);
      }
    });
  }

  scope.base = {
    bus: scope.bus,
    scheme: scope.scheme,
    genesisBlock: scope.genesisBlock,
    consensus: new Consensus(scope),
    transaction: new Transaction(scope),
    block: new Block(scope),
  };


  global.library = scope;

  scope.modules = loadedModules(scope);
  scope.coreApi = loadCoreApi(scope.modules, scope);

  class Bus extends EventEmitter implements IMessageEmitter {
    message(topic: string, ...restArgs) {
      Object.keys(scope.modules).forEach((moduleName) => {
        const module = scope.modules[moduleName];
        const eventName = `on${_.chain(topic).camelCase().upperFirst().value()}`;
        if (typeof (module[eventName]) === 'function') {
          module[eventName].apply(module[eventName], [...restArgs]);
        }
      });
      this.emit(topic, ...restArgs);
    }
  }
  scope.bus = new Bus();
  return scope;
}



function scheme() {
  ZSchema.registerFormat('hex', (str) => {
    let b;
    try {
      b = Buffer.from(str, 'hex');
    } catch (e) {
      return false;
    }

    return b && b.length > 0;
  });

  ZSchema.registerFormat('publicKey', (str) => {
    if (str.length === 0) {
      return true;
    }

    try {
      const publicKey = Buffer.from(str, 'hex');

      return publicKey.length === 32;
    } catch (e) {
      return false;
    }
  });

  ZSchema.registerFormat('splitarray', (str) => {
    try {
      const a = str.split(',');
      return a.length > 0 && a.length <= 1000;
    } catch (e) {
      return false;
    }
  });

  ZSchema.registerFormat('signature', (str) => {
    if (str.length === 0) {
      return true;
    }

    try {
      const signature = Buffer.from(str, 'hex');
      return signature.length === 64;
    } catch (e) {
      return false;
    }
  });

  ZSchema.registerFormat('checkInt', value => !isNumberOrNumberString(value));

  return new ZSchema({});
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

export default init_alt;
