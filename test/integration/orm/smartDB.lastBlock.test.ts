import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as fs from 'fs';
import * as lib from '../lib';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  CUSTOM_GENESIS,
} from './smartDB.test.helpers';

describe('smartDB.lastBlock', () => {
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
