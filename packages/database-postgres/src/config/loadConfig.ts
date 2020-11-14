import { createConnection } from 'typeorm';
import { OrmLogger } from './ormLogger';
import { ILogger } from '@gny/interfaces';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { Account } from '../entity/Account';
import { Asset } from '../entity/Asset';
import { Balance } from '../entity/Balance';
import { Block } from '../entity/Block';
import { Delegate } from '../entity/Delegate';
import { Issuer } from '../entity/Issuer';
import { Round } from '../entity/Round';
import { Transaction } from '../entity/Transaction';
import { Transfer } from '../entity/Transfer';
import { Variable } from '../entity/Variable';
import { Info } from '../entity/Info';
import { Vote } from '../entity/Vote';
import { BlockHistory } from '../entity/BlockHistory';
import { Mldata } from '../entity/Mldata';
import { Prediction } from '../entity/Prediction';
import { SmartDBOptions } from '../sharedInterfaces';

import { InitMigration1605362544330 } from './migrations';

export async function loadConfig(logger: ILogger, input: SmartDBOptions) {
  const options: PostgresConnectionOptions = {
    type: 'postgres',

    host: input.dbHost,
    port: input.dbPort,
    username: input.dbUser,
    password: input.dbPassword,
    database: input.dbDatabase,

    synchronize: false,
    dropSchema: false,
    logging: false,
    migrationsRun: false,
    migrations: [InitMigration1605362544330],
  };

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
      Info,
      Vote,
      BlockHistory,
      Mldata,
      Prediction,
    ],
  });
  Object.assign(options, {
    logger: new OrmLogger(logger),
  });
  const connection = await createConnection(options);
  logger.info('Initialized smartdb');

  await connection.runMigrations({
    transaction: true,
  });

  return connection;
}
