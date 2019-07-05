import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as socketio from 'socket.io';
import * as express from 'express';
import * as compression from 'compression';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as methodOverride from 'method-override';
import * as ZSchema from 'z-schema';
import * as ip from 'ip';
import slots from '../../src/utils/slots';
import queryParser from '../../src/utils/express-query-int';
import ZSchemaExpress from './util';
import { IConfig, Modules, ILogger } from '../../src/interfaces';
import Peer from '../../src/core/peer';
import { StateHelper } from '../../src/core/StateHelper';

const CIPHERS = `
  ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:
  ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:
  ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:
  DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:
  !aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA`;

export default async function intNetwork(
  appConfig: IConfig,
  modules: Modules,
  logger: ILogger
) {
  let sslServer;
  let sslio;

  const expressApp = express();

  expressApp.use(compression({ level: 6 }));
  expressApp.use(cors());
  expressApp.options('*', cors());

  const server = http.createServer(expressApp);
  const io = socketio(server);

  if (appConfig.ssl.enabled) {
    const privateKey = fs.readFileSync(appConfig.ssl.options.key);
    const certificate = fs.readFileSync(appConfig.ssl.options.cert);

    sslServer = https.createServer(
      {
        key: privateKey,
        cert: certificate,
        ciphers: CIPHERS,
      },
      expressApp
    );
    sslio = socketio(sslServer);
  }

  {
    const PAYLOAD_LIMIT_SIZE = '8mb';
    expressApp.engine('html', require('ejs').renderFile);
    expressApp.set('view engine', 'ejs');
    expressApp.set('views', appConfig.publicDir);
    expressApp.use(express.static(appConfig.publicDir));
    expressApp.use(bodyParser.raw({ limit: PAYLOAD_LIMIT_SIZE }));
    expressApp.use(
      bodyParser.urlencoded({
        extended: true,
        limit: PAYLOAD_LIMIT_SIZE,
        parameterLimit: 5000,
      })
    );
    expressApp.use(bodyParser.json({ limit: PAYLOAD_LIMIT_SIZE }));
    expressApp.use(methodOverride());

    const ignore = [
      'id',
      'name',
      'lastBlockId',
      'blockId',
      'transactionId',
      'address',
      'recipientId',
      'senderId',
      'previousBlock',
    ];

    expressApp.use(
      queryParser({
        parser(value, radix, name) {
          if (ignore.indexOf(name) >= 0) {
            return value;
          }

          if (!isNumberOrNumberString(value)) {
            return value;
          }

          return Number.parseInt(value, radix);
        },
      })
    );

    expressApp.use(ZSchemaExpress(scheme()));
    expressApp.use((req, res, next) => {
      const parts = req.url.split('/');
      const host =
        req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      logger.debug(`receive request: ${req.method} ${req.url} from ${host}`);

      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, Content-Length,  X-Requested-With, Content-Type, Accept, request-node-status'
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, HEAD, PUT, DELETE'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        logger.debug('Response pre-flight request');
        return;
      }

      const URI_PREFIXS = ['api', 'peer'];
      const isApiOrPeer =
        parts.length > 1 && URI_PREFIXS.indexOf(parts[1]) !== -1;
      const { whiteList } = appConfig.api.access;

      const forbidden =
        isApiOrPeer && (whiteList.length > 0 && whiteList.indexOf(ip) < 0);

      if (isApiOrPeer && forbidden) {
        res.sendStatus(403);
      } else if (isApiOrPeer && req.headers['request-node-status'] === 'yes') {
        // Add server status info to response header
        const lastBlock = StateHelper.getState().lastBlock;
        res.setHeader('Access-Control-Expose-Headers', 'node-status');
        res.setHeader(
          'node-status',
          JSON.stringify({
            blockHeight: lastBlock.height,
            blockTime: slots.getRealTime(lastBlock.timestamp),
            blocksBehind:
              slots.getNextSlot() -
              (slots.getSlotNumber(lastBlock.timestamp) + 1),
            version: Peer.getVersion(),
          })
        );
        next();
      } else {
        next();
      }
    });

    server.listen(appConfig.port, appConfig.address, err => {
      logger.log(`Server started: ${appConfig.address}:${appConfig.port}`);
      if (!err) {
        logger.log(`Error: ${err}`);
      }
    });
  }

  return {
    express,
    app: expressApp,
    server,
    io,
    sslServer,
    sslio,
  };
}

function isNumberOrNumberString(value) {
  return !(
    Number.isNaN(value) ||
    Number.isNaN(parseInt(value, 10)) ||
    String(parseInt(value, 10)) !== String(value)
  );
}

function scheme() {
  ZSchema.registerFormat('hex', str => {
    let b;
    try {
      b = Buffer.from(str, 'hex');
    } catch (e) {
      return false;
    }

    return b && b.length > 0;
  });

  ZSchema.registerFormat('publicKey', str => {
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

  ZSchema.registerFormat('splitarray', str => {
    try {
      const a = str.split(',');
      return a.length > 0 && a.length <= 1000;
    } catch (e) {
      return false;
    }
  });

  ZSchema.registerFormat('signature', str => {
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
