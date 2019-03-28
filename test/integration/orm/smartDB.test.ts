import {
  SmartDB,
  SmartDBOptions,
} from '../../../packages/database-postgres/src/smartDB';
import { ILogger } from '../../../src/interfaces';
import * as path from 'path';
import { cloneDeep } from 'lodash';
import { CUSTOM_GENESIS } from './data';
import { Block } from '../../../packages/database-postgres/entity/Block';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../../src/utils/address';
import { deepCopy } from '../../../packages/database-postgres/src/codeContract';

const timeout = ms => new Promise(res => setTimeout(res, ms));

const logger: ILogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

function createRandomBytes(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createBlock(height: number) {
  const block: Block & { transactions: [] } = {
    height,
    id: createRandomBytes(32),
    count: 0,
    transactions: [],
    version: 0,
    delegate: createRandomBytes(32),
    prevBlockId: createRandomBytes(32),
    timestamp: height * 1024,
    fees: 0,
    payloadHash: createRandomBytes(64),
    reward: 0,
    signature: createRandomBytes(64),
    _version_: 1,
  };
  return block;
}

async function saveGenesisBlock(smartDB: SmartDB) {
  const block = Object.assign(cloneDeep(CUSTOM_GENESIS), {
    _version_: 0,
  });

  await smartDB.beginBlock(block);
  const transactions = cloneDeep(block.transactions);
  for (const trs of transactions) {
    trs.height = block.height;
    // trs.block = block;
    trs.signatures = JSON.stringify(trs.signatures);
    trs.args = JSON.stringify(trs.args);
    await smartDB.create('Transaction', trs);
  }

  await smartDB.commitBlock(block.height);
}

describe('integration - SmartDB', () => {
  let sut: SmartDB;
  beforeEach(async done => {
    sut = new SmartDB(logger);
    await sut.init();
    done();
  }, 10000);
  afterEach(async done => {
    await sut.close();
    sut = undefined;
    done();
  }, 10000);

  it('init works', async done => {
    await saveGenesisBlock(sut);

    const genesisAccount = { address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t' };
    const result = await sut.load('Account', genesisAccount);
    expect(result).toBeUndefined();
    done();
  }, 5000);

  it('getBlockByHeight', async done => {
    await saveGenesisBlock(sut);

    const loaded = await sut.getBlockByHeight(0);

    const expected = {
      _version_: 0,
      count: 0,
      delegate:
        'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      fees: 0,
      height: 0,
      id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
      payloadHash:
        '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
      previousBlock: null,
      reward: 0,
      signature:
        'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
      timestamp: 0,
      version: 0,
    };
    expect(loaded).toEqual(expected);
    done();
  }, 5000);

  it('getBlockByHeight with transactions', async done => {
    await saveGenesisBlock(sut);

    const loaded = await sut.getBlockByHeight(0, true);
    expect(loaded).toBeTruthy();
    expect(loaded.transactions.length).toEqual(0);
    done();
  }, 5000);

  it('getBlocksByHeightRange', async done => {
    await saveGenesisBlock(sut);

    const blocks = await sut.getBlocksByHeightRange(0, 1, false);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(1);
    done();
  }, 5000);

  it.skip('getBlocksByHeightRange with transactions', async done => {
    done();
  }, 5000);

  it('rollback block current block after beginBlock()', async done => {
    await saveGenesisBlock(sut);

    const one = createBlock(1);
    sut.beginBlock(one);
    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(0);

    await sut.rollbackBlock();
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(0);
    done();
  }, 5000);

  it('rollback block current without call to beginBlock()', async done => {
    await saveGenesisBlock(sut);

    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(0);

    await sut.rollbackBlock();
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(0);

    done();
  }, 5000);

  it('rollback block to previous block (within cache - without Transactions)', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(1);
    sut.beginBlock(first);
    await sut.commitBlock(first.height);

    const second = createBlock(2);
    sut.beginBlock(second);
    await sut.commitBlock(second.height);

    // before
    expect(sut.lastBlockHeight).toEqual(2);
    const existsSecond = await sut.load('Block', { height: 2 }); // get loads only from cache
    const secondWithoutTrs = deepCopy(second);
    Reflect.deleteProperty(secondWithoutTrs, 'transactions');
    expect(existsSecond).toEqual(secondWithoutTrs);

    // act
    await sut.rollbackBlock(1);

    // after
    expect(sut.lastBlockHeight).toEqual(1);

    done();
  }, 5000);

  it.skip('rollback block to previous block (but not cached)', async done => {
    const options: SmartDBOptions = {
      maxBlockHistoryHold: 1,
      cachedBlockCount: 10, // to prevent errors
    };
    const customSut = new SmartDB(logger, options);
    await customSut.init();
    await saveGenesisBlock(customSut);

    const first = createBlock(1);
    customSut.beginBlock(first);
    await customSut.commitBlock(first.height);

    const second = createBlock(2);
    customSut.beginBlock(second);
    await customSut.commitBlock(second.height);

    const third = createBlock(3);
    customSut.beginBlock(third);
    await customSut.commitBlock(third.height);

    // before
    expect(customSut.lastBlockHeight).toEqual(3);

    // act
    await customSut.rollbackBlock(1);

    // after
    expect(customSut.lastBlockHeight).toEqual(1);

    done();
  }, 5000);

  it.skip('prop lastBlock before genesisBlock', done => {
    done();
  }, 5000);

  it.skip('prop lastBlock after genesisBlock', done => {
    done();
  }, 5000);

  it.skip('prop lastBlock after height 1', done => {
    done();
  }, 5000);

  it.skip('createOrLoad("Round")', done => {
    done();
  }, 5000);

  it.skip('initial _version_ is 1', done => {
    done();
  }, 5000);

  it.skip('load only from cache', done => {
    done();
  }, 5000);
});
