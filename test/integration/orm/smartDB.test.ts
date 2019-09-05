import {
  SmartDB,
  SmartDBOptions,
} from '../../../packages/database-postgres/src/smartDB';
import {
  IBlock,
  IAccount,
  IDelegate,
  IAsset,
  ITransaction,
  IVariable,
  IRound,
  IBalance,
} from '../../../packages/interfaces';
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
import {
  createRandomBytes,
  saveGenesisBlock,
  createBlock,
  logger,
} from './smartDB.test.helpers';

describe('integration - SmartDB', () => {
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
    'getBlockByHeight() - returns undefined when not found in cache and in db',
    async done => {
      await saveGenesisBlock(sut);

      const result = await sut.getBlockByHeight(String(300));
      expect(result).toBeUndefined();

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

  it('getBlockById() - returns undefined when Block was not found in cache in db', async done => {
    await saveGenesisBlock(sut);

    const result = await sut.getBlockById(
      'bbd6220626bba4be88617864e0fe8fb32b0c618c42306397bec6ceac7797a246'
    );
    expect(result).toBeUndefined();

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

  it('beginContract() and commitContract() - persits changes after beginBlock(), commitBlock()', async done => {
    await saveGenesisBlock(sut);

    // check before
    const before = await sut.count<Delegate>(Delegate, {});
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
    await sut.create<Delegate>(Delegate, delegate);

    sut.commitContract();

    const shouldBeCached = await sut.get<Delegate>(Delegate, {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(shouldBeCached).toBeTruthy();

    // persist data
    const block = createBlock(String(1));
    await sut.beginBlock(block);
    await sut.commitBlock();

    // check after
    const after = await sut.count<Delegate>(Delegate, {});
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
    const created = sut.create<Delegate>(Delegate, data);
    sut.commitContract(); // end first contract

    // check if cached
    const isCached = await sut.get<Delegate>(Delegate, {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(isCached).toBeTruthy();

    // second contract (change data from first contract)
    sut.beginContract();
    await sut.increase<Delegate>(
      Delegate,
      {
        votes: String(+2000),
      },
      {
        address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      }
    );

    const meantime = await sut.get<Delegate>(Delegate, {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(meantime.votes).toEqual(String(2000));

    sut.rollbackContract();

    // check after rollback
    const result = await sut.get<Delegate>(Delegate, {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    });
    expect(result.votes).toEqual(String(0));

    done();
  });

  it.skip('beginContract() - should never be called after beginBlock() (feature)', async done => {
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
    await sut.create<Account>(Account, account);

    const balance = {
      address: generateAddress(createRandomBytes(32)),
      currency: 'ABC.ABC',
      balance: String(0),
      flag: 1,
    } as IBalance;
    await sut.create<Balance>(Balance, balance);

    // persist changes so far in the DB
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // make other trivial change before the important change
    await sut.update<Balance>(
      Balance,
      {
        balance: String(2000000),
      },
      {
        address: balance.address,
        currency: balance.currency,
      }
    );

    // now run a change that will cause a SQL error when committing the next block
    await sut.update<Account>(
      Account,
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

    const accountKey = {
      address: account.address,
    };

    const balanceKey = {
      address: balance.address,
      currency: balance.currency,
    };

    // check cached Account entity
    const accountCached = await sut.load<Account>(Account, accountKey);
    expect(accountCached.isDelegate).toEqual(0);

    // check cached Balance entity
    const balanceCached = await sut.get<Balance>(Balance, balanceKey);
    expect(balanceCached.balance).toEqual(String(0));

    // check persistet Account
    const accountDbVersion = await sut.findOne<Account>(Account, {
      condition: accountKey,
    });
    expect(accountDbVersion.isDelegate).toEqual(0);

    // check persistet Balance
    const balanceDbVersion = await sut.findOne<Balance>(Balance, {
      condition: balanceKey,
    });
    expect(balanceDbVersion.balance).toEqual(String(0));

    done();
  });

  it.skip('why is the bookkeeper variable not found?', async done => {
    done();
  });
});
