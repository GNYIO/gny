
class LoggerWrapper {
  constructor(name, logger) {
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

class LogManager {
  static getLogger(name) {
    if (!LogManager.defaultLogger) {
      throw new Error('first set LogManager.setLogger = logger');
    }
    return new LoggerWrapper(name, LogManager.defaultLogger);
  }

  static setLogger(logger) {
    LogManager.defaultLogger = logger;
  }
};

module.exports = {
  LogManager,
}
