import { SmartDB } from '@gny/database-postgres';
import * as lib from '../lib';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  CUSTOM_GENESIS,
} from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.lastBlock', () => {
  const dbName = 'lastblockdb';
  let sut: SmartDB;
  const credentials = copyObject(oldCredentials);
  credentials.dbDatabase = dbName;

  beforeAll(async () => {
    await lib.dropDb(dbName);
    await lib.createDb(dbName);
  }, lib.tenSeconds);

  afterAll(async () => {
    await lib.dropDb(dbName);
  }, lib.tenSeconds);

  beforeEach(async () => {
    await lib.resetDb(dbName);

    sut = new SmartDB(logger, credentials);
    await sut.init();
  }, lib.tenSeconds);

  afterEach(async () => {
    await sut.close();
  }, lib.tenSeconds);

  it('prop lastBlock - before genesisBlock', () => {
    expect.assertions(1);
    expect(sut.lastBlock).toBeUndefined();
  }, 5000);

  it('prop lastBlock - after genesisBlock', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    expect(sut.lastBlock).toEqual(CUSTOM_GENESIS);
  }, 5000);

  it('prop lastBlock - after height 1', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    expect(sut.lastBlock).toEqual(first);
  }, 5000);

  it('prop lastBlock - after rollbackBlock()', async () => {
    expect.assertions(2);

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
  });
});
