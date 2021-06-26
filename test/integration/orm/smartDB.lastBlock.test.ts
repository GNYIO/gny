import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as lib from '../lib';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  CUSTOM_GENESIS,
} from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { cloneDeep } from 'lodash';

describe('smartDB.lastBlock', () => {
  const dbName = 'lastblockdb';
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

  it('prop lastBlock - before genesisBlock', done => {
    expect(sut.lastBlock).toBeUndefined();
    done();
  }, 5000);

  it('prop lastBlock - after genesisBlock', async done => {
    await saveGenesisBlock(sut);

    expect(sut.lastBlock).toEqual(CUSTOM_GENESIS);
    done();
  }, 5000);

  it('prop lastBlock - after height 1', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    expect(sut.lastBlock).toEqual(first);

    done();
  }, 5000);

  it('prop lastBlock - after rollbackBlock()', async done => {
    await saveGenesisBlock(sut);

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    const block3 = createBlock(String(3));
    sut.beginBlock(block3);
    await sut.commitBlock();

    // check before
    expect(sut.lastBlock).toEqual(block3);

    await sut.rollbackBlock(String(1));

    // check after
    expect(sut.lastBlock).toEqual(block1);

    done();
  });
});
