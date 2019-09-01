import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as fs from 'fs';
import * as lib from '../lib';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';

describe('smartDB.getBlocksByHeightRange()', () => {
  let sut: SmartDB;
  let configRaw: string;

  beforeAll(done => {
    (async () => {
      await lib.stopAndKillPostgres();
      configRaw = fs.readFileSync('ormconfig.postgres.json', {
        encoding: 'utf8',
      });
      await lib.sleep(500);

      done();
    })();
  }, lib.oneMinute);

  beforeEach(done => {
    (async () => {
      // stopping is safety in case a test before fails
      await lib.stopAndKillPostgres();
      await lib.spawnPostgres();
      sut = new SmartDB(logger, {
        cachedBlockCount: 10,
        maxBlockHistoryHold: 10,
        configRaw: configRaw,
      });
      await sut.init();

      done();
    })();
  }, lib.oneMinute);

  afterEach(done => {
    (async () => {
      await sut.close();
      await lib.sleep(4 * 1000);
      await lib.stopAndKillPostgres();
      await lib.sleep(15 * 1000);

      done();
    })();
  }, lib.oneMinute);

  it('getBlocksByHeightRange()', async done => {
    await saveGenesisBlock(sut);

    const blocks = await sut.getBlocksByHeightRange(
      String(0),
      String(1),
      false
    );
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(1);
    done();
  }, 5000);

  it('getBlocksByHeightRange() - with transactions', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    sut.commitBlock();

    const blocks = await sut.getBlocksByHeightRange(String(0), String(1), true);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(2);
    expect(blocks[0].transactions.length).toEqual(0);
    expect(blocks[0].transactions.length).toEqual(0);

    done();
  }, 5000);

  it('getBlocksByHeightRange() - is always ordered in ascending order (without trs)', async done => {
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

    done();
  }, 5000);

  it('getBlocksByHeightRange() - is always ordered in ascending order (with trs)', async done => {
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

    done();
  }, 5000);

  it('getBlocksByHeightRange() - is always ordered in ascending order (even after some blocks got rolled back)', async done => {
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

    done();
  });

  it('getBlocksByHeightRange() - WHERE height >= min AND height <= max', async done => {
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

    done();
  }, 5000);

  it('getBlocksByHeightRange() - throws if min param is greater then max param', async () => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const MIN = String(1);
    const MAX = String(0);

    const resultPromise = sut.getBlocksByHeightRange(MIN, MAX);

    return expect(resultPromise).rejects.toThrow();
  }, 5000);

  it('getBlocksByHeightRange() - returns empty array if no blocks were found in db', async done => {
    await saveGenesisBlock(sut);

    const result = await sut.getBlocksByHeightRange(String(100), String(200));
    expect(result).toEqual([]);

    done();
  });
});
