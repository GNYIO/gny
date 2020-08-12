import { ILogger } from '@gny/interfaces';

import {
  createLogger as winstonCreateLogger,
  format,
  transports,
  Logger,
} from 'winston';
const { combine, timestamp, json, errors } = format;
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


function orchestrateWinstonLogger() {
  const winstonFormat = combine(errors({ stack: true }), timestamp(), json());

  let logger: Logger = null;

  const disableMongoLogging = Boolean(process.env['GNY_MONGO_LOGGING_DISABLE']);
  if (disableMongoLogging === false) {

    const mongoIp = process.env['GNY_MONGO_LOGGING_IP'] || '135.181.46.217';
    const mongoAuth = process.env['GNY_MONGO_LOGGING_AUTH'] || 'myuser:pass1';
    const mongoPort = process.env['GNY_MONGO_LOGGING_PORT'] || 27017;
    const mongoAuthDb = process.env['GNY_MONGO_LOGGING_AUTH_DB'] || 'gny';
    const uri = `mongodb://${mongoAuth}@${mongoIp}:${mongoPort}/gny?authSource=${mongoAuthDb}&retryWrites=true&w=majority`;
    console.log(`uri: ${uri}`);

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
    // todo catch MongoDb connection error

    logger = winstonCreateLogger({
      format: winstonFormat,
      transports: [
        new transports.Console({
          level: 'silly',
        }),
        winstonTransport,
      ],
    });
    } else {
    logger = winstonCreateLogger({
      format: winstonFormat,
      transports: [
        new transports.Console({
          level: 'silly',
        }),
      ],
    });

    logger.info('\n\ndisabled mongodb logging\n\n');
  }

  return logger;
}


function newMetaObject(tracerLevel: string, ip: string, version: string, network: string) {
  return {
    tracer: tracerLevel,
    ip: ip,
    version: version,
    timestamp: Date.now(),
    network: network,
  };
}

export function createLogger(
  consoleLogLevel: LogLevel,
  ip: string,
  version: string,
  network: string
): ILogger {

  const logger = orchestrateWinstonLogger();

  const wrapper: ILogger = {
    log(...args: string[]) {
      const message = args[0];
      logger.silly(message, {
        info: newMetaObject('log', ip, version, network),
      });
      return undefined;
    },
    trace(...args: string[]) {
      const message = args[0];
      logger.debug(message, {
        info: newMetaObject('trace', ip, version, network),
      });
      return undefined;
    },
    debug(...args: string[]) {
      const message = args[0];
      logger.verbose(message, {
        info: newMetaObject('debug', ip, version, network),
      });
      return undefined;
    },
    info(...args: string[]) {
      const message = args[0];
      logger.info(message, {
        info: newMetaObject('info', ip, version, network),
      });
      return undefined;
    },
    warn(...args: string[]) {
      const message = args[0];
      logger.warn(message, {
        info: newMetaObject('warn', ip, version, network),
      });
      return undefined;
    },
    error(...args: string[]) {
      const message = args[0];
      logger.error(message, {
        info: newMetaObject('error', ip, version, network),
      });
      return undefined;
    },
    fatal(...args: string[]) {
      const message = args[0];
      logger.error(message, {
        info: newMetaObject('fatal', ip, version, network),
      });
      return undefined;
    },
  };

  return wrapper;
}
