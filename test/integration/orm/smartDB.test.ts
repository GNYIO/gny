import {
  SmartDB,
  SmartDBOptions,
} from '../../../packages/database-postgres/src/smartDB';
import { ILogger } from '../../../src/interfaces';
import * as path from 'path';
import { cloneDeep } from 'lodash';
import { CUSTOM_GENESIS } from './data';
import { Block } from '../../../packages/database-postgres/entity/Block';
import { randomBytes } from 'crypto';
import { generateAddress } from '../../../src/utils/address';
import { deepCopy } from '../../../packages/database-postgres/src/codeContract';

const timeout = ms => new Promise(res => setTimeout(res, ms));

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

function createBlock(height: number) {
  const block: Block & { transactions: [] } = {
    height,
    id: createRandomBytes(32),
    count: 0,
    transactions: [],
    version: 0,
    delegate: createRandomBytes(32),
    prevBlockId: createRandomBytes(32),
    timestamp: height * 1024,
    fees: 0,
    payloadHash: createRandomBytes(64),
    reward: 0,
    signature: createRandomBytes(64),
    _version_: 1,
  };
  return block;
}

async function saveGenesisBlock(smartDB: SmartDB) {
  const block = Object.assign(cloneDeep(CUSTOM_GENESIS), {
    _version_: 0, // TODO should be version 1 (or completly without _version_)
  });

  await smartDB.beginBlock(block);
  const transactions = cloneDeep(block.transactions);
  for (const trs of transactions) {
    trs.height = block.height;
    // trs.block = block;
    trs.signatures = JSON.stringify(trs.signatures);
    trs.args = JSON.stringify(trs.args);
    await smartDB.create('Transaction', trs);
  }

  await smartDB.commitBlock(block.height);
}

describe('integration - SmartDB', () => {
  let sut: SmartDB;
  beforeEach(async done => {
    sut = new SmartDB(logger);
    await sut.init();
    done();
  }, 10000);
  afterEach(async done => {
    await sut.close();
    sut = undefined;
    done();
  }, 10000);

  it('init works', async done => {
    await saveGenesisBlock(sut);

    const genesisAccount = { address: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t' };
    const result = await sut.load('Account', genesisAccount);
    expect(result).toBeUndefined();
    done();
  }, 5000);

  it('getBlockByHeight', async done => {
    await saveGenesisBlock(sut);

    const loaded = await sut.getBlockByHeight(0);

    const expected = {
      _version_: 0,
      count: 0,
      delegate:
        'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      fees: 0,
      height: 0,
      id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
      payloadHash:
        '4b1598f8e52794520ea65837b44f58b39517cda40548ef6094e5b24c11af3493',
      previousBlock: null,
      reward: 0,
      signature:
        'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
      timestamp: 0,
      version: 0,
    };
    expect(loaded).toEqual(expected);
    done();
  }, 5000);

  it('getBlockByHeight with transactions', async done => {
    await saveGenesisBlock(sut);

    const loaded = await sut.getBlockByHeight(0, true);
    expect(loaded).toBeTruthy();
    expect(loaded.transactions.length).toEqual(0);
    done();
  }, 5000);

  it('getBlockById without transactions', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(1);
    sut.beginBlock(first);
    await sut.commitBlock(first.height);

    const result = await sut.getBlockById(first.id, false);
    const expected = Object.assign({}, first);
    delete expected.transactions;
    delete expected._version_;

    expect(result).toEqual(expected);

    done();
  });

  it('getBlockById with transactions', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(1);
    sut.beginBlock(first);
    await sut.commitBlock(first.height);

    const result = await sut.getBlockById(first.id, true);
    const expected = Object.assign({}, first);
    delete expected._version_;

    expect(result).toEqual(expected);
    expect(result.transactions.length).toEqual(0);

    done();
  });

  it('getBlocksByHeightRange', async done => {
    await saveGenesisBlock(sut);

    const blocks = await sut.getBlocksByHeightRange(0, 1, false);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(1);
    done();
  }, 5000);

  it('getBlocksByHeightRange with transactions', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(1);
    sut.beginBlock(first);
    sut.commitBlock(first.height);

    const blocks = await sut.getBlocksByHeightRange(0, 1, true);
    expect(blocks).toBeTruthy();
    expect(blocks.length).toEqual(2);
    expect(blocks[0].transactions.length).toEqual(0);
    expect(blocks[0].transactions.length).toEqual(0);

    done();
  }, 5000);

  it('rollback block current block after beginBlock()', async done => {
    await saveGenesisBlock(sut);

    const one = createBlock(1);
    sut.beginBlock(one);
    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(0);

    await sut.rollbackBlock();
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(0);

    done();
  }, 5000);

  it('rollback block current without call to beginBlock()', async done => {
    await saveGenesisBlock(sut);

    expect(sut.currentBlock).not.toBeUndefined();
    expect(sut.lastBlockHeight).toEqual(0);

    await sut.rollbackBlock();
    expect(sut.currentBlock).toBeFalsy();
    expect(sut.lastBlockHeight).toEqual(0);

    done();
  }, 5000);

  it('rollback block to previous block (within cache - without Transactions)', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(1);
    sut.beginBlock(first);
    await sut.commitBlock(first.height);

    const second = createBlock(2);
    sut.beginBlock(second);
    await sut.commitBlock(second.height);

    // before
    expect(sut.lastBlockHeight).toEqual(2);
    const existsSecond = await sut.load('Block', { height: 2 }); // get loads only from cache
    const secondWithoutTrs = deepCopy(second);
    Reflect.deleteProperty(secondWithoutTrs, 'transactions');
    expect(existsSecond).toEqual(secondWithoutTrs);

    // act
    await sut.rollbackBlock(1);

    // after
    expect(sut.lastBlockHeight).toEqual(1);

    done();
  }, 5000);

  it.skip('rollback block to previous block (but not cached)', async done => {
    const options: SmartDBOptions = {
      maxBlockHistoryHold: 1,
      cachedBlockCount: 10, // to prevent errors
    };
    const customSut = new SmartDB(logger, options);
    await customSut.init();
    await saveGenesisBlock(customSut);

    const first = createBlock(1);
    customSut.beginBlock(first);
    await customSut.commitBlock(first.height);

    const second = createBlock(2);
    customSut.beginBlock(second);
    await customSut.commitBlock(second.height);

    const third = createBlock(3);
    customSut.beginBlock(third);
    await customSut.commitBlock(third.height);

    // before
    expect(customSut.lastBlockHeight).toEqual(3);

    // act
    await customSut.rollbackBlock(1);

    // after
    expect(customSut.lastBlockHeight).toEqual(1);

    done();
  }, 5000);

  it('prop lastBlock before genesisBlock', done => {
    expect(sut.lastBlock).toBeUndefined();
    done();
  }, 5000);

  it('prop lastBlock after genesisBlock', async done => {
    await saveGenesisBlock(sut);

    const expected = {
      ...CUSTOM_GENESIS,
      _version_: 0,
    };
    expect(sut.lastBlock).toEqual(expected);
    done();
  }, 5000);

  it('prop lastBlock after height 1', async done => {
    await saveGenesisBlock(sut);

    const first = createBlock(1);
    sut.beginBlock(first);
    await sut.commitBlock(first.height);

    expect(sut.lastBlock).toEqual(first);

    done();
  }, 5000);

  it('createOrLoad("Round") - create entity', async done => {
    await saveGenesisBlock(sut);

    const round = {
      fee: 0,
      reward: 0,
      round: 1,
    };
    const result = await sut.createOrLoad('Round', round);

    expect(result.create).toEqual(true);
    expect(result.entity).toEqual({
      fee: 0,
      reward: 0,
      round: 1,
      _version_: 1,
    });
    done();
  }, 5000);

  it('createOrLoad("Round") - load entity', async done => {
    await saveGenesisBlock(sut);

    const round = {
      fee: 0,
      reward: 0,
      round: 1,
    };
    const createResult = await sut.createOrLoad('Round', round);

    const roundKey = {
      round: 1,
    };
    const loadResult = await sut.createOrLoad('Round', roundKey);

    expect(loadResult.create).toEqual(false);
    expect(loadResult.entity).toEqual({
      round: 1,
      fee: 0,
      reward: 0,
      _version_: 1,
    });

    done();
  }, 5000);

  it('createOrLoad() - entity is tracked after operation', async done => {
    await saveGenesisBlock(sut);

    const round = {
      fee: 0,
      reward: 0,
      round: 1,
    };
    const createResult = await sut.createOrLoad('Round', round);

    // load only from cache
    const result = await sut.get('Round', { round: 1 });
    expect(result).toEqual({
      fee: 0,
      reward: 0,
      round: 1,
      _version_: 1,
    });

    done();
  });

  it.skip('createOrLoad() - create entity with composite key', async done => {
    done();
  });

  it.skip('createOrLoad() - load entity by composite key', async done => {
    done();
  });

  it('get() loads entity only from cache - untracked -> returns undefined', async done => {
    await saveGenesisBlock(sut);

    const key = { round: 3 };
    const result = await sut.get('Round', key);

    expect(result).toBeUndefined();
    done();
  });

  it('get() loads entity from cache - tracked -> returns entity', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
    };
    const createdValue = await sut.create('Delegate', data);

    const key = {
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

  it('get() loads entity', async done => {
    done();
  });

  it('create() - initial _version_ is 1 after creation', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'GZr2NYvHqp9keXPVsAp6EDHTiT3y',
      gny: 0,
    };
    const result = await sut.create('Account', data);
    expect(result).toBeTruthy();
    expect(result._version_).toEqual(1);
    done();
  }, 5000);

  it('create() - throws if Model was not registered', async () => {
    await saveGenesisBlock(sut);

    const WRONG_SPELLED_MODEL = 'DELG';
    const data = {
      address: 'G77TLqGkKcU3tzVM9acAB3V1iGsd',
    };
    const createPromise = sut.create(WRONG_SPELLED_MODEL, data);
    return expect(createPromise).rejects.toEqual(
      new Error("unregistered model 'DELG'")
    );
  }, 5000);

  it('create() - returns other object reference', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    };
    const createResult = await sut.create('Account', data);

    const expected = {
      _version_: 1,
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: 0,
      isDelegate: 0,
      isLocked: 0,
      lockAmount: 0,
      lockHeight: 0,
    };

    expect(createResult).not.toBe(expected); // not same reference
    expect(createResult).toEqual(expected); // deepEquals (same values)
    done();
  });

  it('create() - throws if no primary key is provided', async () => {
    await saveGenesisBlock(sut);

    const wrongData = {
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

    const wrongCompositeKeyData = {
      currency: 'ABC.ABC', // missing property address
    };
    const createPromise = sut.create('Balance', wrongCompositeKeyData);
    return expect(createPromise).rejects.toEqual(
      new Error(
        "entity must contains primary key ( model = 'Balance' entity = '[object Object]' )"
      )
    );
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
    };
    const result1 = await sut.create('Delegate', delegate1);

    const delegate2 = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      username: 'a1300',
    };
    const result2 = await sut.create('Delegate', delegate2);

    const delegate3 = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'xpgeng',
    };
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
    };
    const createdResult = await sut.create('Delegate', delegate1);

    const result = await sut.getAll('Delegate');

    expect(result.length).toEqual(1);
    expect(result[0]).toEqual(createdResult); // structure is the same
    expect(result[0]).not.toBe(createdResult); // reference is not the same
    done();
  });

  it('prop blocksCount after initalization', done => {
    expect(sut.blocksCount).toEqual(0);
    done();
  });

  it('prop blocksCount after genesis block', async done => {
    await saveGenesisBlock(sut);
    expect(sut.blocksCount).toEqual(1);
    done();
  });

  it('beginBlock() called with "wrong" height throws', async done => {
    await saveGenesisBlock(sut);

    const wrongBlock = createBlock(2);
    expect(() => sut.beginBlock(wrongBlock)).toThrow(
      'argName or verify can not be null or undefined'
    );
    done();
  });

  it('beginBlock() called without block throws', async done => {
    await saveGenesisBlock(sut);

    expect(() => sut.beginBlock(undefined)).toThrow();
    done();
  });

  it('count() - no account -> returns count 0', async done => {
    await saveGenesisBlock(sut);

    const key = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.count('Account', key);
    expect(result).toEqual(0);
    done();
  });

  it('count() - after save -> returns count 1', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(1);
    sut.beginBlock(block);

    const delegate = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      producedBlocks: 0,
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
    };
    await sut.create('Delegate', delegate);

    // need to save block in order to save changes to DB
    await sut.commitBlock(block.height);

    const key = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.count('Delegate', {});
    expect(result).toEqual(1);

    done();
  });

  it.skip('if you miss a mandatory property while creating a model, should not get saved', async done => {
    done();
  });

  it('beginContract() and commitContract() - persits changes after beginBlock(), commitBlock()', async done => {
    await saveGenesisBlock(sut);

    // check before
    const before = await sut.count('Delegate', {});
    expect(before).toEqual(0);

    sut.beginContract(); // start

    const delegate = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'a1300',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: 0,
      producedBlocks: 0,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
    };
    await sut.create('Delegate', delegate);

    sut.commitContract();

    const shouldBeCached = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(shouldBeCached).toBeTruthy();

    // persist data
    const block = createBlock(1);
    await sut.beginBlock(block);
    await sut.commitBlock(block.height);

    // check after
    const after = await sut.count('Delegate', {});
    expect(after).toEqual(1);

    done();
  });

  it('beginContract() and commitContract() - can rollback changes made during a contract', async done => {
    await saveGenesisBlock(sut);

    // first contract
    sut.beginContract();
    const data = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: 0,
      producedBlocks: 0,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
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
        votes: +2000,
      },
      {
        address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      }
    );

    const meantime = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(meantime.votes).toEqual(2000);

    sut.rollbackContract();

    // check after rollback
    const result = await sut.get('Delegate', {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(result.votes).toEqual(0);

    done();
  });

  it('increase() - increases by number x', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: 0,
      producedBlocks: 1,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
    };

    await sut.create('Delegate', data);

    await sut.increase(
      'Delegate',
      {
        producedBlocks: 2,
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      }
    );

    const result = await sut.get('Delegate', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    });
    expect(result.producedBlocks).toEqual(3);
    done();
  });

  it('increase can increase more than one property at time', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
      votes: 0,
      producedBlocks: 0,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
    };

    await sut.create('Delegate', data);

    await sut.increase(
      'Delegate',
      {
        producedBlocks: 2,
        missedBlocks: 1,
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      }
    );

    const result = await sut.get('Delegate', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    });
    expect(result.producedBlocks).toEqual(2);
    expect(result.missedBlocks).toEqual(1);
    done();
  });

  it('increase() - by composite primary key', async done => {
    await saveGenesisBlock(sut);

    const balance1 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
      balance: 1,
    };
    await sut.create('Balance', balance1);

    const balance2 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD', // same address, other currency
      balance: 1,
    };
    await sut.create('Balance', balance2);

    // increase only balance1
    await sut.increase(
      'Balance',
      {
        balance: 1,
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
        currency: 'ABC.ABC',
      }
    );

    const result1 = await sut.get('Balance', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
    });
    const result2 = await sut.get('Balance', {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD',
    });
    expect(result1.balance).toEqual(2);
    expect(result2.balance).toEqual(1);
    done();
  });

  it.skip('increase can increase many DB rows not only one', async done => {
    done();
  });

  it('increase() - can decrease value by number x', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: 4000,
    };
    await sut.create('Account', data);

    await sut.increase(
      'Account',
      {
        gny: -1000,
      },
      {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      }
    );

    const result = await sut.get('Account', {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(result.gny).toEqual(3000);

    done();
  });

  it.skip('del() - deletes entity from cache', async done => {
    done();
  });

  it.skip('del() - deletes entity from DB after beginBlock() and commitBlock()', async done => {
    done();
  });

  it.skip('findAll()', async done => {
    await sut.findAll();
    done();
  });

  it.skip('findAll() limit and offset', async done => {
    done();
  });

  it.skip('findOne()', async done => {
    done();
  });

  it.skip('findOne() should not look into the cache', async done => {
    done();
  });

  it.skip('it should never happen that beginContract() should be called after beginBlock()', async done => {
    done();
  });

  // get() should load an entity from cache solely by its unique properties
  // load() should load an entity from db solely by its unique properties
});
