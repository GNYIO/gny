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
import { Vote } from '../entity/Vote';
import { BlockHistory } from '../entity/BlockHistory';
import { Mldata } from '../entity/Mldata';
import { Prediction } from '../entity/Prediction';

export async function loadConfig(logger: ILogger, optionsRaw: string) {
  const options: PostgresConnectionOptions = JSON.parse(
    optionsRaw
  ) as PostgresConnectionOptions;

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
    ],
  });
  Object.assign(options, {
    logger: new OrmLogger(logger),
  });
  const connection = await createConnection(options);
  logger.info('Initialized smartdb');

  return connection;
}
