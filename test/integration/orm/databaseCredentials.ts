import { SmartDBOptions } from '../../../packages/database-postgres/src/sharedInterfaces';

export const credentials: SmartDBOptions = {
  dbDatabase: 'postgres',
  dbHost: 'localhost',
  dbPassword: 'docker',
  dbPort: 3456,
  dbUser: 'postgres',

  cachedBlockCount: 10,
};
