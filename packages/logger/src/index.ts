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
  'mongodb://admin:admin@49.12.111.183:27017/gny?authSource=admin&retryWrites=true&w=majority';

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
      storeHost: false,
      tryReconnect: true,
      decolorize: true,
      leaveConnectionOpen: false,
      metaKey: 'info',
    }),
  ],
});

export function createLogger(
  consoleLogLevel: LogLevel,
  ip: string,
  version: string
): ILogger {
  function newInfo(tracerLevel: string) {
    return {
      tracer: tracerLevel,
      ip: ip,
      version: version,
      timestamp: Date.now(),
    };
  }

  const wrapper: ILogger = {
    log(...args: string[]) {
      const message = String(args[0]);
      logger.silly(message, {
        info: newInfo('log'),
      });
      return undefined;
    },
    trace(...args: string[]) {
      const message = args[0];
      logger.debug(message, {
        info: newInfo('trace'),
      });
      return undefined;
    },
    debug(...args: string[]) {
      const message = args[0];
      logger.verbose(message, {
        info: newInfo('debug'),
      });
      return undefined;
    },
    info(...args: string[]) {
      const message = args[0];
      logger.info(message, {
        info: newInfo('info'),
      });
      return undefined;
    },
    warn(...args: string[]) {
      const message = args[0];
      logger.warn(message, {
        info: newInfo('warn'),
      });
      return undefined;
    },
    error(...args: string[]) {
      const message = args[0];
      logger.error(message, {
        info: newInfo('error'),
      });
      return undefined;
    },
    fatal(...args: string[]) {
      const message = args[0];
      logger.error(message, {
        info: newInfo('fatal'),
      });
      return undefined;
    },
  };

  return wrapper;
}
