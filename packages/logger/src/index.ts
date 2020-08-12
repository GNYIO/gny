import * as tracer from 'tracer';
import * as fs from 'fs';
import { ILogger } from '@gny/interfaces';

import {
  createLogger as winstonCreateLogger,
  format,
  transports,
} from 'winston';
const { combine, timestamp, label, json, ms, errors } = format;
import * as winstonMongoDb from 'winston-mongodb';

export enum LogLevel {
  log = 0,
  trace = 1,
  debug = 2,
  info = 3,
  warn = 4,
  error = 5,
  fatal = 6,
}

const ip = process.env['GNY_LOG_IP'] || '135.181.46.217';
const uri = `mongodb://myuser:pass1@${ip}:27017/gny?authSource=gny&retryWrites=true&w=majority`;

const test = combine(errors({ stack: true }), timestamp(), json());

const winstonTransport = new winstonMongoDb.MongoDB({
  level: 'silly',
  db: uri,
  collection: 'logging',
  storeHost: false,
  tryReconnect: true,
  decolorize: true,
  leaveConnectionOpen: false,
  metaKey: 'info',
});
winstonTransport.on('error', err => {
  console.log('error occurred');
  throw err;
});

const logger = winstonCreateLogger({
  format: test,
  transports: [
    new transports.Console({
      level: 'silly',
    }),
    winstonTransport,
  ],
});

export function createLogger(
  consoleLogLevel: LogLevel,
  ip: string,
  version: string,
  network: string
): ILogger {
  function newMetaObject(tracerLevel: string) {
    return {
      tracer: tracerLevel,
      ip: ip,
      version: version,
      timestamp: Date.now(),
      network: network,
    };
  }

  const wrapper: ILogger = {
    log(...args: string[]) {
      const message = String(args[0]);
      logger.silly(message, {
        info: newMetaObject('log'),
      });
      return undefined;
    },
    trace(...args: string[]) {
      const message = args[0];
      logger.debug(message, {
        info: newMetaObject('trace'),
      });
      return undefined;
    },
    debug(...args: string[]) {
      const message = args[0];
      logger.verbose(message, {
        info: newMetaObject('debug'),
      });
      return undefined;
    },
    info(...args: string[]) {
      const message = args[0];
      logger.info(message, {
        info: newMetaObject('info'),
      });
      return undefined;
    },
    warn(...args: string[]) {
      const message = args[0];
      logger.warn(message, {
        info: newMetaObject('warn'),
      });
      return undefined;
    },
    error(...args: string[]) {
      const message = args[0];
      logger.error(message, {
        info: newMetaObject('error'),
      });
      return undefined;
    },
    fatal(...args: string[]) {
      const message = args[0];
      logger.error(message, {
        info: newMetaObject('fatal'),
      });
      return undefined;
    },
  };

  return wrapper;
}
