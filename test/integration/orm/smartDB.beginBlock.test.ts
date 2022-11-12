import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as lib from '../lib';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { cloneDeep } from 'lodash';

describe('smartDB.beginBlock()', () => {
  const dbName = 'beginblockdb';
  let sut: SmartDB;
  const credentials = cloneDeep(oldCredentials);
  credentials.dbDatabase = dbName;

  beforeAll(done => {
    (async () => {
      await lib.dropDb(dbName);
      await lib.createDb(dbName);
      done();
    })();
  }, lib.tenSeconds);

  afterAll(done => {
    (async () => {
      await lib.dropDb(dbName);
      done();
    })();
  }, lib.tenSeconds);

  beforeEach(done => {
    (async () => {
      await lib.resetDb(dbName);

      sut = new SmartDB(logger, credentials);
      await sut.init();

      done();
    })();
  }, lib.tenSeconds);

  afterEach(done => {
    (async () => {
      await sut.close();

      done();
    })();
  }, lib.tenSeconds);

  it('beginBlock() - called with too big height throws', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const wrongBlock = createBlock(String(2));
    expect(() => sut.beginBlock(wrongBlock)).toThrow(
      'invalid block height 2, last = 0'
    );
  });

  it('beginBlock() - called with too small height throws', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    const otherFirst = createBlock(String(1));
    expect(() => sut.beginBlock(otherFirst)).toThrow(
      'invalid block height 1, last = 2'
    );
  });

  it('beginBlock() - called twice with same block after commitBlock() height throws', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // begin block with same block
    expect(() => sut.beginBlock(block)).toThrow(
      'invalid block height 1, last = 1'
    );
  });

  it('beginBlock() - called without block throws', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    expect(() => sut.beginBlock(undefined)).toThrow();
  });
});
