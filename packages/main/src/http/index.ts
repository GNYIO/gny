import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import * as compression from 'compression';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as methodOverride from 'method-override';
import * as ip from 'ip';
import { slots } from '@gny/utils';
import queryParser from './express-query-int';
import { IConfig, Modules, ILogger, INetwork } from '@gny/interfaces';
import Peer from '../../src/core/peer';
import { StateHelper } from '../../src/core/StateHelper';

const CIPHERS = `
  ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:
  ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:
  ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:
  DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:
  !aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA`;

export async function composeNetwork(
  appConfig: IConfig,
  modules: Modules,
  logger: ILogger
) {
  let sslServer;

  const expressApp = express();

  expressApp.use(compression({ level: 6 }));
  expressApp.use(cors());
  expressApp.options('*', cors());

  const server = http.createServer(expressApp);

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
  }

  {
    const PAYLOAD_LIMIT_SIZE = '8mb';
    expressApp.engine('html', require('ejs').renderFile);
    expressApp.set('view engine', 'ejs');
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

    expressApp.use((req, res, next) => {
      const parts = req.url.split('/');
      const host =
        req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      logger.debug(
        `receive request: ${req.method} ${
          req.url
        } from remoteHost: ${host}, localAddress: ${
          req.connection.localAddress
        }`
      );

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
      if (err) {
        logger.log(`Error: ${err}`);
      }
    });
  }

  const network: INetwork = {
    express,
    app: expressApp,
    server,
    sslServer,
  };
  return network;
}

function isNumberOrNumberString(value) {
  return !(
    Number.isNaN(value) ||
    Number.isNaN(parseInt(value, 10)) ||
    String(parseInt(value, 10)) !== String(value)
  );
}
