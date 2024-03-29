import { SmartDB } from '@gny/database-postgres';
import * as lib from '../lib';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.getBlocksByHeightRange()', () => {
  const dbName = 'getblocksbyheightrangedb';
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

  it('getBlocksByHeightRange()', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const blocks = await sut.getBlocksByHeightRange(
      String(0),
      String(1),
      false
    );
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(1);
  }, 5000);

  it('getBlocksByHeightRange() - with transactions', async () => {
    expect.assertions(4);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const blocks = await sut.getBlocksByHeightRange(String(0), String(1), true);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(2);
    // @ts-ignore
    expect(blocks[0].transactions.length).toEqual(0);
    // @ts-ignore
    expect(blocks[0].transactions.length).toEqual(0);
  }, 5000);

  it('getBlocksByHeightRange() - is always ordered in ascending order (without trs)', async () => {
    expect.assertions(5);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    const third = createBlock(String(3));
    sut.beginBlock(third);
    await sut.commitBlock();

    const withTransactions = false;
    const blocks = await sut.getBlocksByHeightRange(
      String(0),
      String(3),
      withTransactions
    );
    expect(blocks.length).toEqual(4);
    expect(blocks[0].height).toEqual(String(0));
    expect(blocks[1].height).toEqual(String(1));
    expect(blocks[2].height).toEqual(String(2));
    expect(blocks[3].height).toEqual(String(3));
  }, 5000);

  it('getBlocksByHeightRange() - is always ordered in ascending order (with trs)', async () => {
    expect.assertions(5);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    const third = createBlock(String(3));
    sut.beginBlock(third);
    await sut.commitBlock();

    const withTransactions = true;
    const blocks = await sut.getBlocksByHeightRange(
      String(0),
      String(3),
      withTransactions
    );
    expect(blocks.length).toEqual(4);
    expect(blocks[0].height).toEqual(String(0));
    expect(blocks[1].height).toEqual(String(1));
    expect(blocks[2].height).toEqual(String(2));
    expect(blocks[3].height).toEqual(String(3));
  }, 5000);

  it('getBlocksByHeightRange() - is always ordered in ascending order (even after some blocks got rolled back)', async () => {
    expect.assertions(7);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    const third = createBlock(String(3));
    sut.beginBlock(third);
    await sut.commitBlock();

    const fourth = createBlock(String(4));
    sut.beginBlock(fourth);
    await sut.commitBlock();

    // act rollback to height 2
    await sut.rollbackBlock(String(2));

    const thrid2 = createBlock(String(3));
    sut.beginBlock(thrid2);
    await sut.commitBlock();

    const fourth2 = createBlock(String(4));
    sut.beginBlock(fourth2);
    await sut.commitBlock();

    const fifth = createBlock(String(5));
    sut.beginBlock(fifth);
    await sut.commitBlock();

    // get result
    const result = await sut.getBlocksByHeightRange(
      String(0),
      String(5),
      false
    );
    expect(result.length).toEqual(6);
    expect(result[0].height).toEqual(String(0));
    expect(result[1].height).toEqual(String(1));
    expect(result[2].height).toEqual(String(2));
    expect(result[3].height).toEqual(String(3));
    expect(result[4].height).toEqual(String(4));
    expect(result[5].height).toEqual(String(5));
  });

  it('getBlocksByHeightRange() - WHERE height >= min AND height <= max', async () => {
    expect.assertions(4);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    const third = createBlock(String(3));
    sut.beginBlock(third);
    await sut.commitBlock();

    const fourth = createBlock(String(4));
    sut.beginBlock(fourth);
    await sut.commitBlock();

    const fifth = createBlock(String(5));
    sut.beginBlock(fifth);
    await sut.commitBlock();

    const sixth = createBlock(String(6));
    sut.beginBlock(sixth);
    await sut.commitBlock();

    const result = await sut.getBlocksByHeightRange(String(3), String(5));

    // should have blocks 4, 5, 6
    expect(result).toHaveLength(3);
    expect(result[0].height).toEqual(String(3));
    expect(result[1].height).toEqual(String(4));
    expect(result[2].height).toEqual(String(5));
  }, 5000);

  it('getBlocksByHeightRange() - throws if min param is greater then max param', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const MIN = String(1);
    const MAX = String(0);

    const resultPromise = sut.getBlocksByHeightRange(MIN, MAX);

    return expect(resultPromise).rejects.toThrow();
  }, 5000);

  it('getBlocksByHeightRange() - returns empty array if no blocks were found in db', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const result = await sut.getBlocksByHeightRange(String(100), String(200));
    expect(result).toEqual([]);
  });

  it('getBlocksByHeightRange() - works also for from: 0, to: 0', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    const fromHeight = String(0);
    const toHeight = String(0);

    const blocks = await sut.getBlocksByHeightRange(fromHeight, toHeight);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(1);
  });
});
