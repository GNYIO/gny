import {
  SmartDB,
  SmartDBOptions,
} from '../../../packages/database-postgres/src/smartDB';
import {
  ILogger,
  IBlock,
  IAccount,
  IDelegate,
  IAsset,
  ITransaction,
  IVariable,
  IRound,
  IBalance,
} from '../../../src/interfaces';
import { CUSTOM_GENESIS } from './data';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../../src/utils/address';
import { cloneDeep } from 'lodash';
import * as fs from 'fs';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/entity/Account';
import { Balance } from '../../../packages/database-postgres/entity/Balance';
import { Asset } from '../../../packages/database-postgres/entity/Asset';
import { Transaction } from '../../../packages/database-postgres/entity/Transaction';
import { Variable } from '../../../packages/database-postgres/entity/Variable';
import { Delegate } from '../../../packages/database-postgres/entity/Delegate';

const logger: ILogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

function createRandomBytes(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createBlock(height: string) {
  const block: IBlock & { transactions: ITransaction[] } = {
    height,
    id: createRandomBytes(32),
    count: 0,
    transactions: [],
    version: 0,
    delegate: createRandomBytes(32),
    prevBlockId: createRandomBytes(32),
    timestamp: Number(height) * 1024, // don't do that on a regular basis
    fees: String(0),
    payloadHash: createRandomBytes(32),
    reward: String(0),
    signature: createRandomBytes(64),
    _version_: 1,
  };
  return block;
}

function createAsset(name: string) {
  const asset: IAsset = {
    name,
    tid: createRandomBytes(32),
    timestamp: String(3000),
    maximum: String(4e8),
    precision: 8,
    quantity: String(0),
    desc: name,
    issuerId: generateAddress(createRandomBytes(32)),
  };
  return asset;
}

function createAccount(address: string) {
  const account = {
    address,
    username: undefined,
    gny: String(0),
  } as IAccount;
  return account;
}

function createTransaction(height: string) {
  const publicKey = createRandomBytes(32);
  const transaction: ITransaction = {
    height,
    type: 0,
    args: JSON.stringify([10 * 1e8, 'G3SSkWs6UFuoVHU3N4rLvXoobbQCt']),
    fee: String(0.1 * 1e8),
    id: randomBytes(32).toString('hex'),
    senderId: generateAddress(publicKey),
    senderPublicKey: publicKey,
    signatures: JSON.stringify([randomBytes(32).toString('hex')]),
    timestamp: 300235235,
  };
  return transaction;
}

async function saveGenesisBlock(smartDB: SmartDB) {
  const block = cloneDeep(CUSTOM_GENESIS);

  await smartDB.beginBlock(block);
  const transactions = cloneDeep(block.transactions);
  for (const trs of transactions) {
    trs.height = block.height;
    // trs.block = block;
    trs.signatures = JSON.stringify(trs.signatures);
    trs.args = JSON.stringify(trs.args);
    await smartDB.create('Transaction', trs);
  }

  await smartDB.commitBlock();
}

describe.skip('integration - SmartDB', () => {
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

  it(
    'getBlockByHeight()',
    async done => {
      await saveGenesisBlock(sut);

      const loaded = await sut.getBlockByHeight(String(0));

      const expected: IBlock = {
        count: 0,
        delegate:
          'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
        fees: String(0),
        height: String(0),
        id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
        payloadHash:
          '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
        prevBlockId: null,
        reward: String(0),
        signature:
          'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
        timestamp: 0,
        version: 0,
      };
      expect(loaded).toEqual(expected);
      done();
    },
    lib.thirtySeconds
  );

  it(
    'getBlockByHeight() - with transactions',
    async done => {
      await saveGenesisBlock(sut);

      const loaded = await sut.getBlockByHeight(String(0), true);
      expect(loaded).toBeTruthy();
      expect(loaded).toHaveProperty('transactions');
      expect(loaded.transactions.length).toEqual(0);
      done();
    },
    lib.thirtySeconds
  );

  it(
    'getBlockById()',
    async done => {
      await saveGenesisBlock(sut);

      const first = createBlock(String(1));
      sut.beginBlock(first);
      await sut.commitBlock();

      const result = await sut.getBlockById(first.id, false);
      const expected = Object.assign({}, first);
      delete expected.transactions;
      delete expected._version_;

      expect(result).toEqual(expected);

      done();
    },
    lib.thirtySeconds
  );

  it('getBlockById() - with transactions', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const result = await sut.getBlockById(first.id, true);
    const expected = Object.assign({}, first);
    delete expected._version_;

    expect(result).toEqual(expected);
    expect(result.transactions.length).toEqual(0);

    done();
  });

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
    const blocks = await sut.getBlocksByHeightRange(0, 3, withTransactions);
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

  it('getBlocksByHeightRange - WHERE height >= min AND height <= max', async done => {
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

  it('getBlocksByHeightRange - throws if min param is greater then max param', async () => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);
    await sut.commitBlock();

    const MIN = String(1);
    const MAX = String(0);

    const resultPromise = sut.getBlocksByHeightRange(MIN, MAX);

    return expect(resultPromise).rejects.toThrow();
  }, 5000);

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
    const existsSecond = await sut.load('Block', {
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
      maxBlockHistoryHold: 1,
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

  it('createOrLoad("Round") - create entity', async done => {
    await saveGenesisBlock(sut);

    const round: IRound = {
      fee: String(0),
      reward: String(0),
      round: String(1),
    };
    const result = await sut.createOrLoad('Round', round);

    const expected = {
      create: true,
      entity: {
        fee: String(0),
        reward: String(0),
        round: String(1),
        _version_: 1,
      },
    };
    expect(result).toEqual(expected);

    done();
  }, 5000);

  it('createOrLoad("Round") - load entity', async done => {
    await saveGenesisBlock(sut);

    const round: IRound = {
      fee: String(0),
      reward: String(0),
      round: String(1),
    };
    const createResult = await sut.createOrLoad('Round', round);

    const expected = {
      create: false,
      entity: {
        round: String(1),
        fee: String(0),
        reward: String(0),
        _version_: 1,
      },
    };

    const key: Partial<IRound> = {
      round: String(1),
    };
    const loadResult = await sut.createOrLoad('Round', key);
    expect(loadResult).toEqual(expected);

    done();
  }, 5000);

  it('createOrLoad() - entity is tracked after operation', async done => {
    await saveGenesisBlock(sut);

    const round: IRound = {
      fee: String(0),
      reward: String(0),
      round: String(1),
    };
    const createResult = await sut.createOrLoad('Round', round);

    // load only from cache
    const result = await sut.get('Round', {
      round: String(1),
    });
    expect(result).toEqual({
      fee: String(0),
      reward: String(0),
      round: String(1),
      _version_: 1,
    });

    done();
  });

  it('createOrLoad() - create entity with composite key', async done => {
    await saveGenesisBlock(sut);

    const balance: IBalance = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
      currency: 'ABC.ABC',
      balance: String(0),
      flag: 1,
    };
    const createdResult = await sut.createOrLoad('Balance', balance);

    const expectedLoadResult = {
      create: true,
      entity: {
        address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
        currency: 'ABC.ABC',
        balance: String(0),
        flag: 1,
        _version_: 1,
      },
    };
    expect(createdResult).toEqual(expectedLoadResult);

    const expected: IBalance = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
      currency: 'ABC.ABC',
      balance: String(0),
      flag: 1,
      _version_: 1,
    };
    const key: Partial<IBalance> = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
      currency: 'ABC.ABC',
    };
    const result = await sut.get('Balance', key);
    expect(result).toEqual(expected);

    done();
  });

  it('createOrLoad() - load entity by composite key', async done => {
    await saveGenesisBlock(sut);

    const account = createAccount('Gjfw7B8WyHq7bw22TwG6gPtdXD19');
    const created = await sut.createOrLoad('Account', account);

    const key: Partial<IAccount> = {
      address: 'Gjfw7B8WyHq7bw22TwG6gPtdXD19',
    };

    const expected = {
      create: false,
      entity: {
        address: 'Gjfw7B8WyHq7bw22TwG6gPtdXD19',
        gny: String(0),
        isDelegate: 0,
        isLocked: 0,
        lockAmount: String(0),
        lockHeight: String(0),
        _version_: 1,
      } as IAccount,
    };

    const result = await sut.createOrLoad('Account', key);
    expect(result).toEqual(expected);
    done();
  });

  it('get() - loads entity only from cache (if untracked returns undefined)', async done => {
    await saveGenesisBlock(sut);

    const key: Partial<IRound> = {
      round: String(3),
    };
    const result = await sut.get('Round', key);

    expect(result).toBeUndefined();
    done();
  });

  it('get() - loads entity from cache (if tracked returns entity)', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
    } as IDelegate;
    const createdValue = await sut.create('Delegate', data);

    const key: Partial<IDelegate> = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.get('Delegate', key);
    expect(result).toEqual({
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      _version_: 1,
    });
    done();
  });

  it('get() - loads entity from cache (by unique key)', async done => {
    await saveGenesisBlock(sut);

    const account = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      username: 'a1300',
      gny: String(0),
    } as IAccount;
    const created = await sut.create('Account', account);

    const uniqueKey: Partial<IAccount> = {
      username: 'a1300',
    };
    const result = await sut.get('Account', uniqueKey);
    expect(result).toEqual(created);
    done();
  });

  it('get() - loads entity from cache - throws if not provided whole composite key', async () => {
    await saveGenesisBlock(sut);

    // first save data
    const balance = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      currency: 'ABC.ABC',
      balance: String(2000),
    } as IBalance;
    await sut.create('Balance', balance);

    const notWholeCompositeKey: Partial<IBalance> = {
      currency: 'ABC.ABC',
    };
    const getPromise = sut.get('Balance', notWholeCompositeKey);
    return expect(getPromise).rejects.toEqual(
      new Error("Cannot read property 'key' of undefined")
    );
  });

  it('create() - initial _version_ is 1 after creation', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'GZr2NYvHqp9keXPVsAp6EDHTiT3y',
      gny: String(0),
    } as IAccount;
    const result = await sut.create('Account', data);
    expect(result).toBeTruthy();
    expect(result._version_).toEqual(1);
    done();
  }, 5000);

  it('create() - throws if Model was not registered', async () => {
    await saveGenesisBlock(sut);

    const WRONG_SPELLED_MODEL = 'DELG';
    const data: Partial<IDelegate> = {
      address: 'G77TLqGkKcU3tzVM9acAB3V1iGsd',
    };
    const createPromise = sut.create(WRONG_SPELLED_MODEL, data);
    return expect(createPromise).rejects.toEqual(
      new Error("unregistered model 'DELG'")
    );
  }, 5000);

  it('create() - returns other object reference', async done => {
    await saveGenesisBlock(sut);

    const data: Partial<IAccount> = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    };
    const createResult = await sut.create('Account', data);

    const expected: IAccount = {
      _version_: 1,
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
    };

    expect(createResult).not.toBe(expected); // not same reference
    expect(createResult).toEqual(expected); // deepEquals (same values)
    done();
  });

  it('create() - throws if no primary key is provided', async () => {
    await saveGenesisBlock(sut);

    const wrongData: Partial<IAccount> = {
      username: 'a1300', // but no property address
    };
    const createPromise = sut.create('Account', wrongData);
    return expect(createPromise).rejects.toEqual(
      new Error(
        "entity must contains primary key ( model = 'Account' entity = '[object Object]' )"
      )
    );
  });

  it('create() - throws if no complete composite key is provided if needed', async () => {
    await saveGenesisBlock(sut);

    const wrongCompositeKeyData: Partial<IBalance> = {
      currency: 'ABC.ABC', // missing property address
    };
    const createPromise = sut.create('Balance', wrongCompositeKeyData);
    return expect(createPromise).rejects.toEqual(
      new Error(
        "entity must contains primary key ( model = 'Balance' entity = '[object Object]' )"
      )
    );
  });

  it.skip('create() - throws if not all mandatory properties are provided', async done => {
    done();
  });

  it.skip('create() - throws if unnecessary properties are provided', async done => {
    done();
  });

  it('getAll() - throws if Model has not memory:true activated', async done => {
    await saveGenesisBlock(sut);

    const MODEL_THAT_IS_NOT_SAVED_IN_MEMORY = 'Account';
    const getAllPromise = sut.getAll(MODEL_THAT_IS_NOT_SAVED_IN_MEMORY);
    expect(getAllPromise).rejects.toThrow();
    done();
  });

  it('getAll() - returns all cached items of one model', async done => {
    await saveGenesisBlock(sut);

    const delegate1 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
    } as IDelegate;
    const result1 = await sut.create('Delegate', delegate1);

    const delegate2 = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      username: 'a1300',
    } as IDelegate;
    const result2 = await sut.create('Delegate', delegate2);

    const delegate3 = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'xpgeng',
    } as IDelegate;
    const result3 = await sut.create('Delegate', delegate3);

    const result = await sut.getAll('Delegate');
    const expected = [result3, result2, result1];

    expect(result).toEqual(expected);
    done();
  });

  it('getAll() - returns not same reference', async done => {
    await saveGenesisBlock(sut);

    const delegate1 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
    } as IDelegate;
    const createdResult = await sut.create('Delegate', delegate1);

    const result = await sut.getAll('Delegate');

    expect(result.length).toEqual(1);
    expect(result[0]).toEqual(createdResult); // structure is the same
    expect(result[0]).not.toBe(createdResult); // reference is not the same
    done();
  });

  it('prop blocksCount - after initalization', done => {
    expect(sut.blocksCount).toEqual(String(0));
    done();
  });

  it('prop blocksCount - after genesis block', async done => {
    await saveGenesisBlock(sut);
    expect(sut.blocksCount).toEqual(String(1));
    done();
  });

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

  it('count() - no account -> returns count 0', async done => {
    await saveGenesisBlock(sut);

    const key: Partial<IAccount> = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.count('Account', key);
    expect(result).toEqual(0);
    done();
  });

  it('count() - after save -> returns count 1', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);

    const delegate = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      producedBlocks: String(0),
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
    } as IDelegate;
    await sut.create('Delegate', delegate);

    // need to save block in order to save changes to DB
    await sut.commitBlock();

    const key: Partial<IAccount> = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.count('Delegate', {});
    expect(result).toEqual(1);

    done();
  });

  it.skip('create() - if mandatory property is missing, should throw', async done => {
    done();
  });

  it('beginContract() and commitContract() - persits changes after beginBlock(), commitBlock()', async done => {
    await saveGenesisBlock(sut);

    // check before
    const before = await sut.count('Delegate', {});
    expect(before).toEqual(0);

    sut.beginContract(); // start

    const delegate: IDelegate = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'a1300',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: String(0),
      producedBlocks: String(0),
      missedBlocks: String(0),
      fees: String(0),
      rewards: String(0),
    };
    await sut.create('Delegate', delegate);

    sut.commitContract();

    const shouldBeCached: IDelegate = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(shouldBeCached).toBeTruthy();

    // persist data
    const block = createBlock(String(1));
    await sut.beginBlock(block);
    await sut.commitBlock();

    // check after
    const after = await sut.count('Delegate', {});
    expect(after).toEqual(1);

    done();
  });

  it('beginContract() and commitContract() - can rollback changes made during a contract', async done => {
    await saveGenesisBlock(sut);

    // first contract
    sut.beginContract();
    const data: IDelegate = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: String(0),
      producedBlocks: String(0),
      missedBlocks: String(0),
      fees: String(0),
      rewards: String(0),
    };
    const created = sut.create('Delegate', data);
    sut.commitContract(); // end first contract

    // check if cached
    const isCached = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(isCached).toBeTruthy();

    // second contract (change data from first contract)
    sut.beginContract();
    await sut.increase(
      'Delegate',
      {
        votes: String(+2000),
      },
      {
        address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      }
    );

    const meantime: IDelegate = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(meantime.votes).toEqual(String(2000));

    sut.rollbackContract();

    // check after rollback
    const result: IDelegate = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(result.votes).toEqual(String(0));

    done();
  });

  it('increase() - increases by number x', async done => {
    await saveGenesisBlock(sut);

    const data: IDelegate = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: String(0),
      producedBlocks: String(1),
      missedBlocks: String(0),
      fees: String(0),
      rewards: String(0),
    };

    await sut.create('Delegate', data);

    await sut.increase(
      'Delegate',
      {
        producedBlocks: String(2),
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      }
    );

    const result = await sut.get('Delegate', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    });
    expect(result.producedBlocks).toEqual(String(3));
    done();
  });

  it('increase() - can increase more than one property at time', async done => {
    await saveGenesisBlock(sut);

    const data: IDelegate = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: String(0),
      producedBlocks: String(0),
      missedBlocks: String(0),
      fees: String(0),
      rewards: String(0),
    };

    await sut.create('Delegate', data);

    await sut.increase(
      'Delegate',
      {
        producedBlocks: String(2),
        missedBlocks: String(1),
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      }
    );

    const result = await sut.get('Delegate', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    });
    expect(result.producedBlocks).toEqual(String(2));
    expect(result.missedBlocks).toEqual(String(1));
    done();
  });

  it('increase() - by composite primary key', async done => {
    await saveGenesisBlock(sut);

    const balance1: Partial<IBalance> = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
      balance: String(1),
    };
    await sut.create('Balance', balance1);

    const balance2: Partial<IBalance> = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD', // same address, other currency
      balance: String(1),
    };
    await sut.create('Balance', balance2);

    // increase only balance1
    await sut.increase(
      'Balance',
      {
        balance: String(1),
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
        currency: 'ABC.ABC',
      }
    );

    const result1: IBalance = await sut.get('Balance', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
    });
    const result2: IBalance = await sut.get('Balance', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD',
    });
    expect(result1.balance).toEqual(String(2));
    expect(result2.balance).toEqual(String(1));
    done();
  });

  it.skip('increase() - can increase many DB rows not only one', async done => {
    done();
  });

  it('increase() - can decrease value by number x', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(4000),
    } as IAccount;
    await sut.create('Account', data);

    await sut.increase(
      'Account',
      {
        gny: String(-1000),
      },
      {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      }
    );

    const result: IAccount = await sut.get('Account', {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(result.gny).toEqual(String(3000));

    done();
  });

  it('del() - deletes entity from cache', async done => {
    await saveGenesisBlock(sut);

    const account: Partial<IAccount> = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(0),
    };
    await sut.create('Account', account);

    // check before
    const before: IAccount = await sut.get('Account', {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(before).toBeTruthy();

    // delete
    await sut.del('Account', {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });

    // check after
    const after: IAccount = await sut.get('Account', {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(after).toBeUndefined();

    done();
  });

  it('delete by unique key', async done => {
    await saveGenesisBlock(sut);

    const account: Partial<IAccount> = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      username: 'a1300',
      gny: String(0),
    };
    await sut.create('Account', account);

    // delete
    await sut.del('Account', {
      username: 'a1300',
    });

    // check after
    const after = await sut.get('Account', {
      username: 'a1300',
    });
    expect(after).toBeUndefined();

    done();
  });

  it('del() - deletes entity from cache (with composite primary key)', async done => {
    await saveGenesisBlock(sut);

    const balance = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      currency: 'ABC.ABC',
      balance: String(3000),
    } as IBalance;
    const created: IBalance = await sut.create('Balance', balance);

    // check before
    const compositeKey: Partial<IBalance> = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      currency: 'ABC.ABC',
    };
    const before: IBalance = await sut.get('Balance', compositeKey);
    expect(before).toEqual(created);

    // delete
    await sut.del('Balance', compositeKey);

    // check after
    const after: IBalance = await sut.get('Balance', compositeKey);
    expect(after).toBeUndefined();

    done();
  });

  it('del() - deletes entity from DB after beginBlock() and commitBlock()', async done => {
    await saveGenesisBlock(sut);

    const account: Partial<IAccount> = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'a1300',
      gny: String(0),
    };
    await sut.create('Account', account);

    // first create account and persist with next block
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // before: check how many accounts exist
    const before = await sut.count('Account', {});
    expect(before).toEqual(1);

    const key: Partial<IAccount> = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
    };
    await sut.del('Account', key);

    // then delete account and persist with next block
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // after: check how many accounts exist
    const after = await sut.count('Account', {});
    expect(after).toEqual(0);

    done();
  });

  it('findAll() - works with generics', async done => {
    await saveGenesisBlock(sut);

    const account1 = createAccount('G3igL8sTPQzNquy87bYAR37NoYRNn');
    const created1 = await sut.create('Account', account1);

    const account2 = createAccount('G3y6swmiyCguASMfm46yyUrKWv17w');
    const created2 = await sut.create('Account', account2);

    const account3 = createAccount('G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr');
    const created3 = await sut.create('Account', account3);

    const result = await sut.findAll<Account>(Account, {
      condition: {
        address: {
          $in: [
            'G3igL8sTPQzNquy87bYAR37NoYRNn',
            'G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr',
          ],
        },
      },
      sort: {
        address: -1,
      },
    });

    const expected = [created1, created3];
    expect(result).toEqual(expected);

    done();
  });

  it('findAll() - access directly DB, no cache read', async done => {
    await saveGenesisBlock(sut);

    // populate cache with one entity
    const account: Partial<Account> = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'xpgeng',
      gny: String(100000),
    };
    await sut.create('Account', account);

    const result = await sut.findAll<Account>(Account, {
      condition: {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      },
    });
    expect(result).toEqual([]);
    expect(result.length).toEqual(0);
    done();
  });

  it('findAll() - WHERE clause', async done => {
    await saveGenesisBlock(sut);

    await sut.create('Balance', {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      currency: 'ABC.ABC',
      balance: String(100000),
      flag: 1,
    } as IBalance);
    await sut.create('Balance', {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      currency: 'FEE.FEE',
      balance: String(400000),
      flag: 1,
    } as IBalance);
    await sut.create('Balance', {
      address: 'G2S8FueDjrk3jN7pkeui7VmrA8eMU',
      currency: 'TEST.TEST',
      balance: String(20000),
      flag: 1,
    });

    // save changes to block and persist to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // findAll balance lines for one address
    const result: IBalance[] = await sut.findAll<Balance>(Balance, {
      condition: {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      },
    });

    const expected: Balance[] = [
      {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
        currency: 'ABC.ABC',
        balance: String(100000),
        flag: 1,
        _version_: 1,
      },
      {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
        currency: 'FEE.FEE',
        balance: String(400000),
        flag: 1,
        _version_: 1,
      },
    ];
    expect(result).toEqual(expected);
    done();
  });

  it('findAll() - WHERE IN clause ($in)', async done => {
    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC = await sut.create('Asset', abc);

    const tec = createAsset('TEC.TEC');
    await sut.create('Asset', tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // check if 2 Assets exist
    const count = await sut.count('Asset', {});
    expect(count).toEqual(2);

    // load only one
    const names = ['ABC.ABC'];
    const result = await sut.findAll<Asset>(Asset, {
      condition: {
        name: {
          $in: names,
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result).toEqual([createdABC]);
    done();
  });

  it('findAll() - limit', async done => {
    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    await sut.create('Asset', abc);

    const tec = createAsset('TEC.TEC');
    await sut.create('Asset', tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // load both normal
    const both: IAsset[] = await sut.findAll<Asset>(Asset, {
      condition: {},
    });
    expect(both.length).toEqual(2);

    // load only one with limit
    const limit: IAsset[] = await sut.findAll<Asset>(Asset, {
      condition: {},
      limit: 1,
    });
    expect(limit.length).toEqual(1);
    done();
  });

  it('findAll() - limit and offset', async done => {
    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC: IAsset = await sut.create('Asset', abc);

    const tec = createAsset('TEC.TEC');
    const createdTEC: IAsset = await sut.create('Asset', tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const loadFirst = await sut.findAll<Asset>(Asset, {
      condition: {},
      limit: 1,
      offset: 0,
    });
    const loadSecond = await sut.findAll<Asset>(Asset, {
      condition: {},
      limit: 1,
      offset: 1,
    });

    expect(loadFirst).toEqual([createdABC]);
    expect(loadSecond).toEqual([createdTEC]);
    done();
  });

  it('findAll() - sort results ASCENDING', async done => {
    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC: IAsset = await sut.create('Asset', abc);

    const tec = createAsset('TEC.TEC');
    const createdTEC: IAsset = await sut.create('Asset', tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.findAll<Asset>(Asset, {
      condition: {},
      sort: {
        name: 1,
      },
    });

    expect(result).toEqual([createdABC, createdTEC]);

    done();
  });

  it('findAll() - sort results DESCENDING', async done => {
    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC: IAsset = await sut.create('Asset', abc);

    const tec = createAsset('TEC.TEC');
    const createdTEC: IAsset = await sut.create('Asset', tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.findAll<Asset>(Asset, {
      condition: {},
      sort: {
        name: -1,
      },
    });

    expect(result).toEqual([createdTEC, createdABC]);

    done();
  });

  it('findAll() - search for a range of values with $gte and $lte', async done => {
    await saveGenesisBlock(sut);

    // save first transaction in block 1
    const trs1 = createTransaction(String(1));
    const createdTrs1: ITransaction = await sut.create('Transaction', trs1);
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // save another transaction in block 2
    const trs2 = createTransaction(String(2));
    const createdTrs2 = await sut.create('Transaction', trs2);
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // load data directly from DB
    const minHeight = String(0);
    const maxHeight = String(1);
    const result = await sut.findAll<Transaction>(Transaction, {
      condition: {
        height: { $gte: minHeight, $lte: maxHeight },
      },
    });

    const expected = {
      ...createdTrs1,
      message: null,
      secondSignature: null,
    };

    expect(result).toEqual([expected]);

    done();
  });

  it('findOne() - load entity from DB by primary key', async done => {
    await saveGenesisBlock(sut);

    const account1 = createAccount('G3SSkWs6UFuoVHU3N4rLvXoobbQCt');
    await sut.create('Account', account1);

    const account2 = createAccount('G26gsyu1VkF1z4JJ6UGa5VTa4wdWj');
    await sut.create('Account', account2);

    const account3 = createAccount('G3DDP47cyZiLi6nrm7kzbdvAqK5Cz');
    await sut.create('Account', account3);

    // persist changes to dB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const expected: Account = {
      address: 'G26gsyu1VkF1z4JJ6UGa5VTa4wdWj',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      publicKey: null,
      secondPublicKey: null,
      username: null,
      _version_: 1,
    };

    const key: Partial<IAccount> = {
      address: 'G26gsyu1VkF1z4JJ6UGa5VTa4wdWj',
    };
    const result: IAccount = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(result).toEqual(expected);
    done();
  });

  it('findOne() - load entity from DB by unique key', async done => {
    await saveGenesisBlock(sut);

    const account = createAccount('G26gsyu1VkF1z4JJ6UGa5VTa4wdWj');
    account.username = 'xpgeng';
    await sut.create('Account', account);

    // persist changes to dB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const expected: IAccount = {
      address: 'G26gsyu1VkF1z4JJ6UGa5VTa4wdWj',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      publicKey: null,
      secondPublicKey: null,
      username: 'xpgeng',
      _version_: 1,
    };

    const key: Partial<IAccount> = {
      username: 'xpgeng',
    };
    const result: IAccount = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(result).toEqual(expected);
    done();
  });

  it('findOne() - load entity from DB by composite key', async done => {
    await saveGenesisBlock(sut);

    // prepare data
    const balance1: IBalance = {
      address: 'G2QvwiGhjbG5xPixfzstB9qxBqep6',
      currency: 'FFF.FFF',
      balance: String(1000),
      flag: 1,
    };
    const createdBalance1: IBalance = await sut.create('Balance', balance1);

    const balance2: IBalance = {
      address: 'GRgor74w6tEZJ2hSVQkS5yCNKjmg',
      currency: 'ABC.ABC',
      balance: String(200000),
      flag: 1,
    };
    const createdBalance2: IBalance = await sut.create('Balance', balance2);

    const balance3: IBalance = {
      address: 'G4LNZorUUGjt3rimMv5Cr2zod9PoS',
      currency: 'GGG.GGG',
      balance: String(300000),
      flag: 1,
    };
    const createdBalance3: IBalance = await sut.create('Balance', balance3);

    // persist changes to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const compositeKey: Partial<IBalance> = {
      address: 'GRgor74w6tEZJ2hSVQkS5yCNKjmg',
      currency: 'ABC.ABC',
    };
    const result: IBalance = await sut.findOne<Balance>(Balance, {
      condition: compositeKey,
    });
    expect(result).toEqual(createdBalance2);

    done();
  });

  it('findOne() should not look into the cache', async done => {
    await saveGenesisBlock(sut);

    const account1 = createAccount('G4LNZorUUGjt3rimMv5Cr2zod9PoS');
    await sut.create('Account', account1);

    const account2 = createAccount('G2QP6FBxZj19bzdBKKWxW8xoUo2vx');
    await sut.create('Account', account2);

    const account3 = createAccount('G3igL8sTPQzNquy87bYAR37NoYRNn');
    await sut.create('Account', account3);

    // do not persist changes (changes are only in cache)

    const key: Partial<IAccount> = {
      address: 'G2QP6FBxZj19bzdBKKWxW8xoUo2vx',
    };
    const result = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(result).toBeUndefined();

    done();
  });

  it('findOne() - throws if more than one 1 entity is found', async () => {
    await saveGenesisBlock(sut);

    const balance1: IBalance = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
      balance: String(1),
      flag: 1,
    };
    const balance2: IBalance = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD', // same address, other currency
      balance: String(1),
      flag: 1,
    };

    await sut.create('Balance', balance1);
    await sut.create('Balance', balance2);

    // persist changes to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const notFullKey: Partial<IBalance> = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    };
    const findOnePromise = sut.findOne<Balance>(Balance, {
      condition: notFullKey,
    });
    return expect(findOnePromise).rejects.toEqual(
      new Error(
        'many entities found ( model = \'Balance\' , params = \'{"address":"G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN"}\' )'
      )
    );
  });

  it.skip('beginContract() - should never be called after beginBlock()', async done => {
    done();
  });

  it.skip('load() - loads entity from cache (if cached), otherwise from db', async done => {
    done();
  });

  it.skip('load() should load an entity from db solely by its unique properties', async done => {
    done();
  });

  it('commitBlock() - fails, then cache and last block in DB should be correct', async done => {
    await saveGenesisBlock(sut);

    const account = {
      address: generateAddress(createRandomBytes(32)),
      gny: String(0),
      username: null,
      publicKey: createRandomBytes(32),
      isDelegate: 0,
    } as IAccount;
    await sut.create('Account', account);

    const balance = {
      address: generateAddress(createRandomBytes(32)),
      currency: 'ABC.ABC',
      balance: String(0),
      flag: 1,
    } as IBalance;
    await sut.create('Balance', balance);

    // persist changes so far in the DB
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // make other trivial change before the important change
    await sut.update(
      'Balance',
      {
        balance: String(2000000),
      },
      {
        address: balance.address,
        currency: balance.currency,
      }
    );

    // now run a change that will cause a SQL error when committing the next block
    await sut.update(
      'Account',
      {
        isDelegate: null,
      },
      {
        address: account.address,
      }
    );

    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    let errorOccured = false;
    try {
      await sut.commitBlock();
    } catch (err) {
      errorOccured = true;
    }

    expect(errorOccured).toEqual(true);

    const accountKey: Partial<IAccount> = {
      address: account.address,
    };

    const balanceKey: Partial<IBalance> = {
      address: balance.address,
      currency: balance.currency,
    };

    // check cached Account entity
    const accountCached: IAccount = await sut.get('Account', accountKey);
    expect(accountCached.isDelegate).toEqual(0);

    // check cached Balance entity
    const balanceCached: IBalance = await sut.get('Balance', balanceKey);
    expect(balanceCached.balance).toEqual(String(0));

    // check persistet Account
    const accountDbVersion: IAccount = await sut.findOne<Account>(Account, {
      condition: accountKey,
    });
    expect(accountDbVersion.isDelegate).toEqual(0);

    // check persistet Balance
    const balanceDbVersion: IBalance = await sut.findOne<Balance>(Balance, {
      condition: balanceKey,
    });
    expect(balanceDbVersion.balance).toEqual(String(0));

    done();
  });

  it('rollbackBlock() - revert persisted and cached CREATE', async done => {
    await saveGenesisBlock(sut);

    // changes for block 1
    const account = createAccount('GBR31pwhxvsgtrQDfzRxjfoPB62r');

    const createdAccountResult = await sut.create('Account', account);

    expect(createdAccountResult).toHaveProperty('lockAmount');
    expect(createdAccountResult).toHaveProperty('lockHeight');

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key: Partial<IAccount> = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
    };

    // check before rollbackBlock()
    const cached: IAccount = await sut.get('Account', key);
    expect(cached).toEqual(createdAccountResult);
    const expectedFromDb = {
      ...createdAccountResult,
      publicKey: null,
      secondPublicKey: null,
      username: null,
    };
    const fromDb: IAccount = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(fromDb).toEqual(expectedFromDb);

    // act
    await sut.rollbackBlock(String(0));

    // check after rollbackBlock()
    const cachedAfter: IAccount = await sut.get('Account', key);
    expect(cachedAfter).toBeUndefined();
    const fromDbAfter: IAccount = await sut.findOne<Account>(Account, {
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
    const createdDelegate: IDelegate = await sut.create('Delegate', delegate);

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key: Partial<IAccount> = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
    };

    // check before rollbackBlock()
    const cachedBefore: IDelegate = await sut.get('Delegate', key);
    expect(cachedBefore).toEqual(createdDelegate);
    const inDbBefore: IDelegate = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbBefore).toEqual(createdDelegate);

    // act
    await sut.rollbackBlock(String(0));

    // check after rollbackBlock()
    const cachedAfter: IDelegate = await sut.get('Delegate', key);
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
    const createdDelegate = await sut.create('Delegate', delegate);

    // persist create
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key: Partial<IDelegate> = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
    };

    // then modify entity
    await sut.update(
      'Delegate',
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
    const cachedBefore: IDelegate = await sut.get('Delegate', key);
    expect(cachedBefore.producedBlocks).toEqual(String(1));
    const inDbBefore: IDelegate = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbBefore.producedBlocks).toEqual(String(1));

    // act
    await sut.rollbackBlock(String(1));

    // check after rollbackBlock()
    const cachedAfter: IDelegate = await sut.get('Delegate', key);
    expect(cachedAfter.producedBlocks).toEqual(String(0));
    const inDbAfter: IDelegate = await sut.findOne<Delegate>(Delegate, {
      condition: key,
    });
    expect(inDbAfter.producedBlocks).toEqual(String(0));

    done();
  });

  it.skip('update() - should increase the _version_ for each call (also wihtin one block)', async done => {
    done();
  });

  it.skip('multiple modifications in one block should incrase the _version_ of the entity', async done => {
    done();
  });

  it('exists() - entity exists in DB after beginBlock()', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    const key: Partial<IBlock> = {
      id: block.id,
    };
    sut.beginBlock(block);
    await sut.commitBlock();

    const exists = await sut.exists('Block', key);
    expect(exists).toEqual(true);
    done();
  });

  it('exists() - entity does not exists in DB', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);

    const key: Partial<IBlock> = {
      id: 'notValidId',
    };
    const exists = await sut.exists('Block', key);
    expect(exists).toEqual(false);
    done();
  });

  it('exists() - can access item after createOrLoad() (false)', async done => {
    await saveGenesisBlock(sut);

    // create() or createOrLoad() does not save entity directly to DB
    const variable: IVariable = {
      key: 'key',
      value: 'value',
    };
    const vare = await sut.createOrLoad('Variable', variable);

    const exists = await sut.exists('Variable', { key: 'key' });
    expect(exists).toEqual(false);
    done();
  });

  it.skip('should exists() always hit the database?', async done => {
    done();
  });

  it('exists() - pass in Array[], should return true if one of the elements is in db', async done => {
    await saveGenesisBlock(sut);

    // create block to persist changes to db
    const transaction: ITransaction = {
      type: 0,
      fee: String(0),
      timestamp: 0,
      senderId: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5',
      senderPublicKey:
        'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      signatures: JSON.stringify([
        '62d8eda0130fff84f75b7937421dff50bd4553b4e30a2ca01e4a8138a0442a6c48f50e45994c8c14d473f8e283f3daf05cc04532d8760cd581ee8660208f280b',
      ]),
      args: JSON.stringify([
        40000000000000000,
        'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
      ]),
      id: 'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
      height: String(1),
    };
    const createdTrans: ITransaction = await sut.create(
      'Transaction',
      transaction
    );

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.exists('Transaction', {
      id: [
        'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
        '0f9c04265f537f389e06aa74bb4c080f77154418ce826607374a3b82af7027ec',
      ],
    });
    expect(result).toEqual(true);

    done();
  });

  it('exists() - pass in Array[], should return false if no of the elements are in db', async done => {
    await saveGenesisBlock(sut);

    // the following transaction will be saved to the db
    const transaction: ITransaction = {
      type: 0,
      fee: String(0),
      timestamp: 0,
      senderId: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5',
      senderPublicKey:
        'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      signatures: JSON.stringify([
        '62d8eda0130fff84f75b7937421dff50bd4553b4e30a2ca01e4a8138a0442a6c48f50e45994c8c14d473f8e283f3daf05cc04532d8760cd581ee8660208f280b',
      ]),
      args: JSON.stringify([
        40000000000000000,
        'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
      ]),
      id: 'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
      height: String(1),
    };
    const createdTrans: ITransaction = await sut.create(
      'Transaction',
      transaction
    );

    // create block to persist changes to db
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.exists('Transaction', {
      id: [
        '9af76a7c85d5f3cb96b9d3b0dc81fdaba1cd5fe2a6722d0a364de02477e6a489',
        '0f9c04265f537f389e06aa74bb4c080f77154418ce826607374a3b82af7027ec',
      ],
    });
    expect(result).toEqual(false);

    done();
  });

  it('exists() - commit Block, now block should exist in DB', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.exists('Block', {
      id: block.id,
    });
    expect(result).toEqual(true);

    done();
  });

  it('exists() - begin Block, now block should NOT exist in DB', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);
    // no commitBlock() so block is only in memory and not in DB

    const result = await sut.exists('Block', {
      id: block.id,
    });
    expect(result).toEqual(false);

    done();
  });

  it.skip('should createOrLoad("Variable") be cached and returned with "sdb.get()"', async done => {
    done();
  });

  it.skip('why is the bookkeeper variable not found?', async done => {
    done();
  });

  it('createOrLoad() - after createOrLoad entity should be cached', async done => {
    const variable: IVariable = {
      key: 'key',
      value: 'value',
    };
    const x = await sut.createOrLoad('Variable', variable);

    const result: IVariable = await sut.get('Variable', { key: 'key' });
    expect(result).toEqual({
      _version_: 1,
      key: 'key',
      value: 'value',
    });
    done();
  });

  describe('use cases', () => {
    it('update of in-memory Model should be persisted after a commitBlock() call', async done => {
      await saveGenesisBlock(sut);

      await sut.createOrLoad('Variable', {
        key: 'some',
        value: 'thing',
      });
      await sut.createOrLoad('Variable', {
        key: 'key',
        value: 'value',
      });

      const block1 = createBlock(String(1));
      sut.beginBlock(block1);
      await sut.commitBlock();

      // pre check
      const preCheckResult = await sut.findAll<Variable>(Variable, {
        condition: {
          key: 'key',
        },
      });
      expect(preCheckResult).toHaveLength(1);
      expect(preCheckResult[0]).toEqual({
        key: 'key',
        value: 'value',
        _version_: 1,
      });

      // act
      await sut.update('Variable', { value: 'newValue' }, { key: 'key' });

      // persist changes
      const block2 = createBlock(String(2));
      sut.beginBlock(block2);
      await sut.commitBlock();

      // check
      const result = await sut.findAll<Variable>(Variable, {
        condition: {
          key: 'key',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        key: 'key',
        value: 'newValue',
        _version_: 2,
      });

      done();
    });
  });
});
