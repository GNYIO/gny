import {
  MetaSchema,
  ModelSchema,
  OneIndex,
  NormalColumn,
} from './modelSchema.js';
import { getConnection, EntityMetadata } from 'typeorm';
import { MetaDataStore } from './decorator/metaDataStore.js';

import { Account } from './entity/Account.js';
import { Asset } from './entity/Asset.js';
import { Balance } from './entity/Balance.js';
import { Block } from './entity/Block.js';
import { Delegate } from './entity/Delegate.js';
import { Issuer } from './entity/Issuer.js';
import { Round } from './entity/Round.js';
import { Transaction } from './entity/Transaction.js';
import { Transfer } from './entity/Transfer.js';
import { Variable } from './entity/Variable.js';
import { Vote } from './entity/Vote.js';
import { BlockHistory } from './entity/BlockHistory.js';
import { Mldata } from './entity/Mldata.js';
import { Prediction } from './entity/Prediction.js';
import { Burn } from './entity/Burn.js';

export function transform(entity: any) {
  const ormMetaData: EntityMetadata = getConnection().getMetadata(entity);

  const name = ormMetaData.name; // primaryColumns, uniques
  const primaryColumns: OneIndex[] = ormMetaData.primaryColumns.map(column => {
    return {
      isUnique: false,
      columns: [
        {
          propertyName: column.propertyName,
        },
      ],
    };
  });
  const uniqueColumns: OneIndex[] = ormMetaData.uniques.map(uniqueMetaData => {
    return {
      isUnique: true,
      columns: [
        {
          propertyName: uniqueMetaData.columns[0].propertyName,
        },
      ],
    };
  });

  const columns: NormalColumn[] = ormMetaData.columns.map(column => {
    if (column.default === undefined) {
      return {
        name: column.propertyName,
      };
    } else {
      return {
        name: column.propertyName,
        default: column.default,
      };
    }
  });

  const config = MetaDataStore.getOptionsFor(name);

  const meta: MetaSchema = {
    name,
    indices: [...primaryColumns, ...uniqueColumns] || [],
    columns: columns || [],
    ...config,
  };

  return new ModelSchema(meta);
}

export function createMetaSchema() {
  const result = new Map<string, ModelSchema>();

  const account = transform(Account);
  const asset = transform(Asset);
  const balance = transform(Balance);
  const block = transform(Block);
  const delegate = transform(Delegate);
  const issuer = transform(Issuer);
  const round = transform(Round);
  const transaction = transform(Transaction);
  const transfer = transform(Transfer);
  const variable = transform(Variable);
  const vote = transform(Vote);
  const blockHistory = transform(BlockHistory);
  const mldata = transform(Mldata);
  const prediction = transform(Prediction);
  const burn = transform(Burn);

  result.set('Account', account);
  result.set('Asset', asset);
  result.set('Balance', balance);
  result.set('Block', block);
  result.set('Delegate', delegate);
  result.set('Issuer', issuer);
  result.set('Round', round);
  result.set('Transaction', transaction);
  result.set('Transfer', transfer);
  result.set('Variable', variable);
  result.set('Vote', vote);
  result.set('BlockHistory', blockHistory);
  result.set('Mldata', mldata);
  result.set('Prediction', prediction);
  result.set('Burn', burn);

  return result;
}
