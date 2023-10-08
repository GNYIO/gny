import { ILogger } from '@gny/interfaces';

import winston from 'winston';
const { createLogger: winstonCreateLogger, format, transports } = winston;
const { combine, timestamp, errors, colorize, align, printf } = format;

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
