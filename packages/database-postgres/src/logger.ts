import { ILogger } from '@gny/interfaces';

export class LoggerWrapper {
  private name: string;
  private logger: ILogger;
  constructor(name: string, logger: ILogger) {
    if (!name) {
      throw new Error('name');
    }
    this.name = name;
    this.logger = logger;
  }
  log(message) {
    this.logger.log(`[${this.name}] ${message}`);
  }
  trace(message) {
    this.logger.trace(`[${this.name}] ${message}`);
  }
  debug(message) {
    this.logger.debug(`[${this.name}] ${message}`);
  }
  info(message) {
    this.logger.info(`[${this.name}] ${message}`);
  }
  warn(message) {
    this.logger.warn(`[${this.name}] ${message}`);
  }
  error(message) {
    this.logger.error(`[${this.name}] ${message}`);
  }
  fatal(message) {
    this.logger.fatal(`[${this.name}] ${message}`);
  }
}

export class LogManager {
  private static defaultLogger: ILogger;
  static getLogger(name: string) {
    if (!LogManager.defaultLogger) {
      throw new Error('first set LogManager.setLogger = logger');
    }
    return new LoggerWrapper(name, LogManager.defaultLogger);
  }

  static setLogger(logger: ILogger) {
    LogManager.defaultLogger = logger;
  }
}
