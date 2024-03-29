import { SmartDB, BlockHistory } from '@gny/database-postgres';
import * as lib from '../lib';
import { Block } from '@gny/database-postgres';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  createRandomBytes,
  createAccount,
} from './smartDB.test.helpers';
import { Delegate } from '@gny/database-postgres';
import { IDelegate } from '@gny/interfaces';
import { Account } from '@gny/database-postgres';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('SmartDB.rollbackBlock()', () => {
  const dbName = 'rollbackblockdb';
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

  it('rollbackBlock() - rollback current block after beginBlock()', async () => {
    expect.assertions(4);

    await saveGenesisBlock(sut);

    const one = createBlock(String(1));
    sut.beginBlock(one);
    // @ts-ignore
    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(String(0));

    await sut.rollbackBlock();
    // @ts-ignore
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(String(0));
  }, 5000);

  it('rollbackBlock() - current without call to beginBlock()', async () => {
    expect.assertions(4);

    await saveGenesisBlock(sut);

    // @ts-ignore
    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(String(0));

    await sut.rollbackBlock();
    // @ts-ignore
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(String(0));
  }, 5000);

  it('rollbackBlock() - to previous block (within cache - without Transactions)', async () => {
    expect.assertions(3);

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
    const secondWithoutTrs = copyObject(second);
    Reflect.deleteProperty(secondWithoutTrs, 'transactions');
    expect(existsSecond).toEqual(secondWithoutTrs);

    // act
    await sut.rollbackBlock(String(1));

    // after
    expect(sut.lastBlockHeight).toEqual(String(1));
  }, 5000);

  it('rollbackBlock() - to previous block (but not cached)', async () => {
    expect.assertions(2);

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

    // before
    expect(sut.lastBlockHeight).toEqual(String(3));

    // act
    await sut.rollbackBlock(String(1));

    // after
    expect(sut.lastBlockHeight).toEqual(String(1));
  }, 5000);

  it('rollbackBlock() - revert persisted and cached CREATE', async () => {
    expect.assertions(6);

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
  });

  it('rollbackBlock() - revert persisted and cached DEL', async () => {
    expect.assertions(4);

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
  });

  it('rollbackBlock() - revert persisted and cached MODIFY', async () => {
    expect.assertions(4);

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
  });

  it('rollbackBlock() - delete block and blockHistory on rollback', async () => {
    expect.assertions(20);

    await saveGenesisBlock(sut);

    // persist
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // persist
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // persist
    const block3 = createBlock(String(3));
    sut.beginBlock(block3);
    await sut.commitBlock();

    // persist
    const block4 = createBlock(String(4));
    sut.beginBlock(block4);
    await sut.commitBlock();

    // persist
    const block5 = createBlock(String(5));
    sut.beginBlock(block5);
    await sut.commitBlock();

    async function loadBlock(height: string) {
      const block = await sut.findOne<Block>(Block, {
        condition: {
          height,
        },
      });
      if (block === undefined) {
        return undefined;
      }
      block.transactions = [];
      return block;
    }

    async function loadBlockHistory(height: string) {
      const blockHistory = await sut.findOne<BlockHistory>(BlockHistory, {
        condition: {
          height,
        },
      });
      return blockHistory;
    }

    // 1
    const block1InDb = await loadBlock(String(1));
    expect(block1InDb).toEqual(block1);

    const blockHistory1InDb = await loadBlockHistory(String(1));
    expect(blockHistory1InDb).not.toBeUndefined();

    // 2
    const block2InDb = await loadBlock(String(2));
    expect(block2InDb).toEqual(block2);

    const blockHistory2InDb = await loadBlockHistory(String(2));
    expect(blockHistory2InDb).not.toBeUndefined();

    // 3
    const block3InDb = await loadBlock(String(3));
    expect(block3InDb).toEqual(block3);

    const blockHistory3InDb = await loadBlockHistory(String(3));
    expect(blockHistory3InDb).not.toBeUndefined();

    // 4
    const block4InDb = await loadBlock(String(4));
    expect(block4InDb).toEqual(block4);

    const blockHistory4InDb = await loadBlockHistory(String(4));
    expect(blockHistory4InDb).not.toBeUndefined();

    // 5
    const block5InDb = await loadBlock(String(5));
    expect(block5InDb).toEqual(block5);

    const blockHistory5InDb = await loadBlockHistory(String(5));
    expect(blockHistory5InDb).not.toBeUndefined();

    // rollback
    await sut.rollbackBlock(String(1));

    // only block1 and blockhistory1 should be in the database
    // 1
    const block1InDbAfter = await loadBlock(String(1));
    expect(block1InDbAfter).toEqual(block1);

    const blockHistory1InDbAfter = await loadBlockHistory(String(1));
    expect(blockHistory1InDbAfter).toEqual(blockHistory1InDb);

    // 2
    const block2InDbAfter = await loadBlock(String(2));
    expect(block2InDbAfter).toBeUndefined();

    const blockHistory2InDbAfter = await loadBlockHistory(String(2));
    expect(blockHistory2InDbAfter).toBeUndefined();

    // 3
    const block3InDbAfter = await loadBlock(String(3));
    expect(block3InDbAfter).toBeUndefined();

    const blockHistory3InDbAfter = await loadBlockHistory(String(3));
    expect(blockHistory3InDbAfter).toBeUndefined();

    // 4
    const block4InDbAfter = await loadBlock(String(4));
    expect(block4InDbAfter).toBeUndefined();

    const blockHistory4InDbAfter = await loadBlockHistory(String(4));
    expect(blockHistory4InDbAfter).toBeUndefined();

    // 5
    const block5InDbAfter = await loadBlock(String(5));
    expect(block5InDbAfter).toBeUndefined();

    const blockHistory5InDbAfter = await loadBlockHistory(String(5));
    expect(blockHistory5InDbAfter).toBeUndefined();
  });

  it('rollbackBlock() - check MODIFY with load', async () => {
    expect.assertions(6);

    await saveGenesisBlock(sut);

    // create account
    const account = createAccount('G34VFMsS5TuiMNPnQ2YbczXvQpJE2');
    const createdAccount = await sut.create<Account>(Account, account);

    // persist change
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const inCache1 = await sut.load<Account>(Account, {
      address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
    });
    expect(inCache1).toEqual(createdAccount);

    await sut.update<Account>(
      Account,
      {
        gny: String(10),
      },
      {
        address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
      }
    );

    // persist change
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    const inCache2 = await sut.load<Account>(Account, {
      address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
    });
    expect(inCache2).toEqual({
      ...createdAccount,
      gny: String(10),
      _version_: 2,
    });

    await sut.update<Account>(
      Account,
      {
        isDelegate: 1,
      },
      {
        address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
      }
    );

    // persist change
    const block3 = createBlock(String(3));
    sut.beginBlock(block3);
    await sut.commitBlock();

    const inCache3 = await sut.load<Account>(Account, {
      address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
    });
    expect(inCache3).toEqual({
      ...createdAccount,
      gny: String(10),
      isDelegate: 1,
      _version_: 3,
    });

    // rollback to height 2, then check cache
    await sut.rollbackBlock(String(2));

    const inCache2After = await sut.load<Account>(Account, {
      address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
    });
    expect(inCache2After).toEqual({
      ...createdAccount,
      gny: String(10),
      _version_: 2,
    });

    // rollback to height 1, then check cache
    await sut.rollbackBlock(String(1));

    const inCache1After = await sut.load<Account>(Account, {
      address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
    });
    expect(inCache1After).toEqual(createdAccount);

    // rollback to height 0, then check cache
    await sut.rollbackBlock(String(0));

    const inCache0After = await sut.load<Account>(Account, {
      address: 'G34VFMsS5TuiMNPnQ2YbczXvQpJE2',
    });
    expect(inCache0After).toEqual(undefined);
  });
});
