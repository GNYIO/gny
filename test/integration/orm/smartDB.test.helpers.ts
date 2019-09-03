import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { Transaction } from '../../../packages/database-postgres/entity/Transaction';
import {
  IAccount,
  IAsset,
  IBlock,
  ITransaction,
  ILogger,
  IGenesisBlock,
} from '../../../packages/interfaces';
import { randomBytes } from 'crypto';
import { cloneDeep } from 'lodash';
import { generateAddress } from '../../../src/utils/address';
import * as lib from '../lib';
import * as fs from 'fs';

export const CUSTOM_GENESIS: IGenesisBlock = {
  version: 0,
  payloadHash:
    '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
  timestamp: 0,
  prevBlockId: null,
  delegate: 'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
  height: String(0),
  count: 0,
  fees: String(0),
  reward: String(0),
  signature:
    'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
  id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
  transactions: [],
};

export const logger: ILogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

export function createRandomBytes(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

export function createBlock(height: string) {
  const block: IBlock & { transactions: ITransaction[] } = {
    height,
    id: createRandomBytes(32),
    count: 0,
    transactions: [],
    version: 0,
    delegate: createRandomBytes(32),
    prevBlockId: createRandomBytes(32),
    timestamp: Number(height) * 1024, // don't do that on a regular basis
    fees: String(0),
    payloadHash: createRandomBytes(32),
    reward: String(0),
    signature: createRandomBytes(64),
    _version_: 1,
  };
  return block;
}

export function createAsset(name: string) {
  const asset: IAsset = {
    name,
    tid: createRandomBytes(32),
    timestamp: String(3000),
    maximum: String(4e8),
    precision: 8,
    quantity: String(0),
    desc: name,
    issuerId: generateAddress(createRandomBytes(32)),
  };
  return asset;
}

export function createAccount(address: string) {
  const account = {
    address,
    username: undefined,
    gny: String(0),
  } as IAccount;
  return account;
}

export function createTransaction(height: string) {
  const publicKey = createRandomBytes(32);
  const transaction: ITransaction = {
    height,
    type: 0,
    args: JSON.stringify([10 * 1e8, 'G3SSkWs6UFuoVHU3N4rLvXoobbQCt']),
    fee: String(0.1 * 1e8),
    id: randomBytes(32).toString('hex'),
    senderId: generateAddress(publicKey),
    senderPublicKey: publicKey,
    signatures: JSON.stringify([randomBytes(32).toString('hex')]),
    timestamp: 300235235,
  };
  return transaction;
}

export async function saveGenesisBlock(smartDB: SmartDB) {
  const block = cloneDeep(CUSTOM_GENESIS);

  await smartDB.beginBlock(block);
  const transactions = cloneDeep(block.transactions);
  for (const trs of transactions) {
    trs.height = block.height;
    // trs.block = block;
    trs.signatures = JSON.stringify(trs.signatures);
    trs.args = JSON.stringify(trs.args);
    await smartDB.create<Transaction>(Transaction, trs);
  }

  await smartDB.commitBlock();
}
