import {
  SmartDB,
  SmartDBOptions,
} from '../../../packages/database-postgres/src/smartDB';
import { cloneDeep } from 'lodash';
import * as fs from 'fs';
import * as lib from '../lib';
import { Block } from '../../../packages/database-postgres/entity/Block';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  createRandomBytes,
  createAccount,
} from './smartDB.test.helpers';
import { Delegate } from '../../../packages/database-postgres/entity/Delegate';
import { IDelegate, IAccount } from '../../../src/interfaces';
import { Account } from '../../../packages/database-postgres/entity/Account';

describe('SmartDB.rollbackBlock()', () => {
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

  it('rollbackBlock() - rollback current block after beginBlock()', async done => {
    await saveGenesisBlock(sut);

    const one = createBlock(String(1));
    sut.beginBlock(one);
    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(String(0));

    await sut.rollbackBlock();
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(String(0));

    done();
  }, 5000);

  it('rollbackBlock() - current without call to beginBlock()', async done => {
    await saveGenesisBlock(sut);

    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(String(0));

    await sut.rollbackBlock();
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(String(0));

    done();
  }, 5000);

  it('rollbackBlock() - to previous block (within cache - without Transactions)', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const second = createBlock(String(2));
    sut.beginBlock(second);
    await sut.commitBlock();

    // before
    expect(sut.lastBlockHeight).toEqual(String(2));
    const existsSecond = await sut.load<Block>(Block, {
      // get() loads only from cache
      height: String(2),
    });
    const secondWithoutTrs = cloneDeep(second);
    Reflect.deleteProperty(secondWithoutTrs, 'transactions');
    expect(existsSecond).toEqual(secondWithoutTrs);

    // act
    await sut.rollbackBlock(String(1));

    // after
    expect(sut.lastBlockHeight).toEqual(String(1));

    done();
  }, 5000);

  it.skip('rollbackBlock() - to previous block (but not cached)', async done => {
    const options: SmartDBOptions = {
      cachedBlockCount: 10, // to prevent errors
    };
    const customSut = new SmartDB(logger, options);
    await customSut.init();
    await saveGenesisBlock(customSut);

    const first = createBlock(String(1));
    customSut.beginBlock(first);
    await customSut.commitBlock();

    const second = createBlock(String(2));
    customSut.beginBlock(second);
    await customSut.commitBlock();

    const third = createBlock(String(3));
    customSut.beginBlock(third);
    await customSut.commitBlock();

    // before
    expect(customSut.lastBlockHeight).toEqual(String(3));

    // act
    await customSut.rollbackBlock(String(1));

    // after
    expect(customSut.lastBlockHeight).toEqual(String(1));

    done();
  }, 5000);

  it('rollbackBlock() - revert persisted and cached CREATE', async done => {
    await saveGenesisBlock(sut);

    // changes for block 1
    const account = createAccount('GBR31pwhxvsgtrQDfzRxjfoPB62r');

    const createdAccountResult = await sut.create<Account>(Account, account);

    expect(createdAccountResult).toHaveProperty('lockAmount');
    expect(createdAccountResult).toHaveProperty('lockHeight');

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
    };

    // check before rollbackBlock()
    const cached = await sut.load<Account>(Account, key);
    expect(cached).toEqual(createdAccountResult);
    const expectedFromDb = {
      ...createdAccountResult,
      publicKey: null,
      secondPublicKey: null,
      username: null,
    };
    const fromDb = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(fromDb).toEqual(expectedFromDb);

    // act
    await sut.rollbackBlock(String(0));

    // check after rollbackBlock()
    const cachedAfter = await sut.load<Account>(Account, key);
    expect(cachedAfter).toBeUndefined();
    const fromDbAfter = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(fromDbAfter).toBeUndefined();

    done();
  });

  it('rollbackBlock() - revert persisted and cached DEL', async done => {
    await saveGenesisBlock(sut);

    // first save a new entity
    const delegate: IDelegate = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
      tid: createRandomBytes(32),
      username: 'a1300',
      publicKey: createRandomBytes(32),
      votes: String(0),
      producedBlocks: String(0),
      missedBlocks: String(0),
      rewards: String(0),
      fees: String(0),
    };
    const createdDelegate: IDelegate = await sut.create<Delegate>(
      Delegate,
      delegate
    );

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
    };

    // check before rollbackBlock()
    const cachedBefore = await sut.get<Delegate>(Delegate, key);
    expect(cachedBefore).toEqual(createdDelegate);
    const inDbBefore: IDelegate = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbBefore).toEqual(createdDelegate);

    // act
    await sut.rollbackBlock(String(0));

    // check after rollbackBlock()
    const cachedAfter = await sut.get<Delegate>(Delegate, key);
    expect(cachedAfter).toBeUndefined();
    const inDbAfter: IDelegate = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbAfter).toBeUndefined();

    done();
  });

  it('rollbackBlock() - revert persisted and cached MODIFY', async done => {
    await saveGenesisBlock(sut);

    // first create entity
    const delegate: IDelegate = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
      tid: createRandomBytes(32),
      username: 'a1300',
      publicKey: createRandomBytes(32),
      votes: String(0),
      producedBlocks: String(0),
      missedBlocks: String(0),
      rewards: String(0),
      fees: String(0),
    };
    const createdDelegate = await sut.create<Delegate>(Delegate, delegate);

    // persist create
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
    };

    // then modify entity
    await sut.update<Delegate>(
      Delegate,
      {
        producedBlocks: String(1),
      },
      key
    );

    // persist modify
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // check before rollbackBlock()
    const cachedBefore = await sut.get<Delegate>(Delegate, key);
    expect(cachedBefore.producedBlocks).toEqual(String(1));
    const inDbBefore = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbBefore.producedBlocks).toEqual(String(1));

    // act
    await sut.rollbackBlock(String(1));

    // check after rollbackBlock()
    const cachedAfter = await sut.get<Delegate>(Delegate, key);
    expect(cachedAfter.producedBlocks).toEqual(String(0));
    const inDbAfter = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbAfter.producedBlocks).toEqual(String(0));

    done();
  });
});
