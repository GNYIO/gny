import { ILogger } from '../../../../packages/interfaces';
import { Logger, QueryRunner } from 'typeorm';

/**
 * Logs diagnostic ORM data
 */
export class OrmLogger implements Logger {
  private logger: ILogger;
  constructor(logger: ILogger) {
    this.logger = logger;
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    // commented out, output is too big
  }
  logQueryError(
    error: string,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    this.logger.log(
      `[SmartDB-logQueryError] error: ${error}; query: ${query}; parameters: ${
        parameters && parameters.length > 0 ? JSON.stringify(parameters) : ''
      };`
    );
  }
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    this.logger.log(
      `[SmartDB-logQuerySlow] time: ${time}; query: ${query}; parameters: ${
        parameters && parameters.length ? JSON.stringify(parameters) : ''
      }`
    );
  }
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.log(`[SmartDB-logSchemaBuild] message: ${message};`);
  }
  logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.log(`[SmartDB-logMigration] message: ${message};`);
  }
  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    // throw new Error("Method not implemented.");
  }
}
