import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as fs from 'fs';
import * as lib from '../lib';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';

describe('smartDB.beginBlock()', () => {
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

  it('beginBlock() - called with too big height throws', async done => {
    await saveGenesisBlock(sut);

    const wrongBlock = createBlock(String(2));
    expect(() => sut.beginBlock(wrongBlock)).toThrow(
      'invalid block height 2, last = 0'
    );
    done();
  });

  it('beginBlock() - called with too small height throws', async done => {
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
    done();
  });

  it('beginBlock() - called twice with same block after commitBlock() height throws', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // begin block with same block
    expect(() => sut.beginBlock(block)).toThrow(
      'invalid block height 1, last = 1'
    );

    done();
  });

  it('beginBlock() - called without block throws', async done => {
    await saveGenesisBlock(sut);

    expect(() => sut.beginBlock(undefined)).toThrow();
    done();
  });
});
