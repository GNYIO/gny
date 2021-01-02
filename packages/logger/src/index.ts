import { ILogger } from '@gny/interfaces';

import {
  createLogger as winstonCreateLogger,
  format,
  transports,
  Logger,
} from 'winston';
const { combine, timestamp, errors, colorize, align, printf } = format;
import * as ed from '@gny/ed';
import * as crypto from 'crypto';
import { generateAddress } from '@gny/utils';
import * as LokiTransport from 'winston-loki';

function getAddress(secret: string) {
  const keypair = ed.generateKeyPair(
    crypto
      .createHash('sha256')
      .update(secret, 'utf8')
      .digest()
  );
  const publicKey = keypair.publicKey.toString('hex');
  const address = generateAddress(publicKey);

  return address;
}

export enum LogLevel {
  log = 0,
  trace = 1,
  debug = 2,
  info = 3,
  warn = 4,
  error = 5,
  fatal = 6,
}

function orchestrateWinstonLogger(ip: string) {
  const consoleFormat = combine(
    colorize(),
    timestamp(),
    align(),
    errors({ stack: true }),
    printf(
      info =>
        `${info.timestamp} ${info.level}: ${info.message}${
          info.stack ? '\nstack: ' + info.stack : ''
        }`
    )
  );

  const logger: Logger = winstonCreateLogger();

  logger.add(
    new transports.Console({
      format: consoleFormat,
      level: 'silly',
    })
  );
  logger.add(
    new LokiTransport({
      host: String(process.env['GNY_LOKI_HOST']),
      labels: {
        host: ip,
      },
    })
  );

  return logger;
}

function newMetaObject(ip: string, version: string, network: string) {
  return {
    ip: ip,
    v: version,
    net: network,
  };
}

export function createLogger(
  consoleLogLevel: LogLevel,
  ip: string,
  version: string,
  network: string
): ILogger {
  const logger = orchestrateWinstonLogger(ip);

  const wrapper: ILogger = {
    log(...args: string[]) {
      const message = args[0];
      logger.silly(message, newMetaObject(ip, version, network));
      return undefined;
    },
    trace(...args: string[]) {
      const message = args[0];
      logger.debug(message, newMetaObject(ip, version, network));
      return undefined;
    },
    debug(...args: string[]) {
      const message = args[0];
      logger.verbose(message, newMetaObject(ip, version, network));
      return undefined;
    },
    info(...args: string[]) {
      const message = args[0];
      logger.info(message, newMetaObject(ip, version, network));
      return undefined;
    },
    warn(...args: string[]) {
      const message = args[0];
      logger.warn(message, newMetaObject(ip, version, network));
      return undefined;
    },
    error(...args: string[]) {
      const message = args[0];
      logger.error(message, newMetaObject(ip, version, network));
      return undefined;
    },
    fatal(...args: string[]) {
      const message = args[0];
      logger.error(message, newMetaObject(ip, version, network));
      return undefined;
    },
  };

  return wrapper;
}
