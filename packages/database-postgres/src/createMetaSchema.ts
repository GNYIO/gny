import { MetaSchema, ModelSchema, OneIndex, NormalColumn } from './modelSchema';
import { getConnection, EntityMetadata } from 'typeorm';
import { MetaDataStore } from './decorator/metaDataStore';

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
import { Info } from './entity/Info';
import { Vote } from './entity/Vote';
import { BlockHistory } from './entity/BlockHistory';
import { Mldata } from './entity/Mldata';
import { Prediction } from './entity/Prediction';

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
  const info = transform(Info);
  const vote = transform(Vote);
  const blockHistory = transform(BlockHistory);
  const mldata = transform(Mldata);
  const prediction = transform(Prediction);

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
  result.set('Info', info);
  result.set('Vote', vote);
  result.set('BlockHistory', blockHistory);
  result.set('Mldata', mldata);
  result.set('Prediction', prediction);

  return result;
}
