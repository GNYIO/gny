import { createConnection } from 'typeorm';
import { OrmLogger } from './ormLogger';
import { ILogger } from '../../src/interfaces';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { SqljsConnectionOptions } from 'typeorm/driver/sqljs/SqljsConnectionOptions';

import { Account } from './entity/Account';
import { Asset } from './entity/Asset';
import { Balance } from './entity/Balance';
import { Block } from './entity/Block';
import { Delegate } from './entity/Delegate';
import { Issuer } from './entity/Issuer';
import { Round } from './entity/Round';
import { Transaction } from './entity/Transaction';
import { Transfer } from './entity/Transfer';
import { Variable } from './entity/Variable';
import { Vote } from './entity/Vote';
import { BlockHistory } from './entity/BlockHistory';

export async function loadConfig(logger: ILogger, optionsRaw: string) {
  let options: PostgresConnectionOptions | SqljsConnectionOptions = undefined;

  options = JSON.parse(optionsRaw) as
    | PostgresConnectionOptions
    | SqljsConnectionOptions;

  Object.assign(options, {
    entities: [
      Account,
      Asset,
      Balance,
      Block,
      Delegate,
      Issuer,
      Round,
      Transaction,
      Transfer,
      Variable,
      Vote,
      BlockHistory,
    ],
  });
  Object.assign(options, {
    logger: new OrmLogger(logger),
  });
  const connection = await createConnection(options);
  logger.info('Initialized smartdb');

  if ((process.env.NODE_ENV = 'test')) {
    // TODO: remove
    await connection.dropDatabase();
    await connection.synchronize();
  }
  return connection;
}
