import { SmartDBOptions } from '@gny/interfaces';

export const credentials: SmartDBOptions = {
  dbDatabase: 'postgres',
  dbHost: 'localhost',
  dbPassword: 'docker',
  dbPort: 3456,
  dbUser: 'postgres',

  cachedBlockCount: 10,
};
