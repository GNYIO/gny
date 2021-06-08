import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as lib from '../lib';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { credentials } from './databaseCredentials';

describe('smartDB.beginBlock()', () => {
  let sut: SmartDB;

  beforeEach(done => {
    (async () => {
      await lib.resetDb();

      sut = new SmartDB(logger, credentials);
      await sut.init();

      done();
    })();
  }, lib.oneMinute);

  afterEach(done => {
    (async () => {
      await sut.close();
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
