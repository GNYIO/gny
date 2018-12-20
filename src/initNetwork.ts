import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as socketio from 'socket.io';
import * as express from 'express';
import * as compression from 'compression';
import * as cors from 'cors';

const CIPHERS = `
  ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:
  ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:
  ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:
  DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:
  !aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA`;

export default async function intNetwork(options: any) {
  let sslServer;
  let sslio;

  const expressApp = express();

  expressApp.use(compression({ level: 6 }));
  expressApp.use(cors());
  expressApp.options('*', cors());

  const server = http.createServer(expressApp);
  const io = socketio(server);

  if (options.appConfig.ssl.enabled) {
    const privateKey = fs.readFileSync(options.appConfig.ssl.options.key);
    const certificate = fs.readFileSync(options.config.ssl.options.cert);

    sslServer = https.createServer({
      key: privateKey,
      cert: certificate,
      ciphers: CIPHERS,
    }, expressApp);
    sslio = socketio(sslServer);
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