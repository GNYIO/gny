
import * as fs from 'fs';
import * as path from 'path';
import { createConnection, ConnectionOptions } from 'typeorm';
import { OrmLogger } from './ormLogger';
import { ILogger } from '../../src/interfaces';

export async function loadConfig (logger: ILogger) {
  const configPath = path.join(process.cwd(), 'ormconfig.json');
  const optionsRaw = fs.readFileSync(configPath, { encoding: 'utf8' });
  const options: ConnectionOptions = JSON.parse(optionsRaw);

  Object.assign(options, {
    logger: new OrmLogger(logger),
  });
  const connection = await createConnection(options);
  logger.info('Initialized smartdb');

  return connection;
}
