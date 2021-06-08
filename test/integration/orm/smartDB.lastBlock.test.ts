import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as lib from '../lib';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  CUSTOM_GENESIS,
} from './smartDB.test.helpers';
import { credentials } from './databaseCredentials';

describe('smartDB.lastBlock', () => {
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
