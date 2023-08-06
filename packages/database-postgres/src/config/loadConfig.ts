import { createConnection } from 'typeorm';
import { OrmLogger } from './ormLogger.js';
import { ILogger, SmartDBOptions } from '@gny/interfaces';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { Account } from '../entity/Account.js';
import { Asset } from '../entity/Asset.js';
import { Balance } from '../entity/Balance.js';
import { Block } from '../entity/Block.js';
import { Delegate } from '../entity/Delegate.js';
import { Issuer } from '../entity/Issuer.js';
import { Round } from '../entity/Round.js';
import { Transaction } from '../entity/Transaction.js';
import { Transfer } from '../entity/Transfer.js';
import { Variable } from '../entity/Variable.js';
import { Vote } from '../entity/Vote.js';
import { BlockHistory } from '../entity/BlockHistory.js';
import { Mldata } from '../entity/Mldata.js';
import { Prediction } from '../entity/Prediction.js';
import { NftMaker } from '../entity/NftMaker.js';

import {
  InitMigration1605362544330,
  DeleteInfoTable1608475266157,
  CreateNfts1691091279392,
} from './migrations.js';

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
    migrations: [
      InitMigration1605362544330,
      DeleteInfoTable1608475266157,
      CreateNfts1691091279392,
    ],
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
      Vote,
      BlockHistory,
      Mldata,
      Prediction,
      NftMaker,
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
