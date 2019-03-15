
import * as fs from 'fs';
import * as path from 'path';
import { createConnection, ConnectionOptions } from 'typeorm';
import { OrmLogger } from './ormLogger';

export async function loadConfig (logger: any) {
  const configPath = path.join(process.cwd(), 'ormconfig.json');
  const optionsRaw = fs.readFileSync(configPath, { encoding: 'utf8' });
  const options: ConnectionOptions = JSON.parse(optionsRaw);

  Object.assign(options, {
    logger: new OrmLogger(logger),
  });
  const connection = await createConnection(options);
  this.logger.info('Initialized smartdb');

  return connection;
}
