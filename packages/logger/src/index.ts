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

const uri =
  'mongodb://admin:admin@51.103.18.41:27017/gny?authSource=admin&retryWrites=true&w=majority';

// const ip = format((info, options) => {
//     info.ip = 'my.ip.address';
//     info.multiaddrs = '/ipv4/test3';
//     return info;
// });

const test = combine(errors({ stack: true }), timestamp(), json());

const logger = winstonCreateLogger({
  format: test,
  transports: [
    new transports.Console({
      level: 'silly',
    }),
    new winstonMongoDb.MongoDB({
      level: 'silly',
      db: uri,
      collection: 'logging',
      storeHost: true,
      tryReconnect: true,
      decolorize: true,
      leaveConnectionOpen: false,
      metaKey: 'info',
    }),
  ],
});

export function createLogger(consoleLogLevel: LogLevel, ip: string): ILogger {
  const wrapper: ILogger = {
    log(...args: string[]) {
      const message = String(args[0]);
      logger.silly(message, {
        info: {
          tracer: 'log',
          ip: ip,
        },
      });
      return undefined;
    },
    trace(...args: string[]) {
      const message = String(args[0]);
      logger.debug(message, {
        info: {
          tracer: 'trace',
          ip: ip,
        },
      });
      return undefined;
    },
    debug(...args: string[]) {
      const message = String(args[0]);
      logger.verbose(message, {
        info: {
          tracer: 'debug',
          ip: ip,
        },
      });
      return undefined;
    },
    info(...args: string[]) {
      const message = String(args[0]);
      logger.info(message, {
        info: {
          tracer: 'info',
          ip: ip,
        },
      });
      return undefined;
    },
    warn(...args: string[]) {
      const message = String(args[0]);
      logger.warn(message, {
        info: {
          tracer: 'warn',
          ip: ip,
        },
      });
      return undefined;
    },
    error(...args: string[]) {
      const message = String(args[0]);
      logger.error(message, {
        info: {
          tracer: 'error',
          ip: ip,
        },
      });
      return undefined;
    },
    fatal(...args: string[]) {
      const message = String(args[0]);
      logger.error(message, {
        info: {
          tracer: 'fatal',
          ip: ip,
        },
      });
      return undefined;
    },
  };

  return wrapper;
}
