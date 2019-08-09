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
} from '../../../src/interfaces';
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
  Versioned,
  FindAllOptions,
  Condition,
} from '../../../packages/database-postgres/searchTypes';
import { Round } from '../../../packages/database-postgres/entity/Round';
import { Transfer } from '../../../packages/database-postgres/entity/Transfer';
import { Block } from '../../../packages/database-postgres/entity/Block';
import {
  createRandomBytes,
  saveGenesisBlock,
  createBlock,
  logger,
  CUSTOM_GENESIS,
  createAccount,
  createAsset,
  createTransaction,
} from './smartDB.test.helpers';
import { randomBytes } from 'crypto';

describe('smartDB.update()', () => {
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
    'update() - updates (memory-)entity in memory',
    async done => {
      await saveGenesisBlock(sut);

      const createdVariable = await sut.create<Variable>(Variable, {
        key: 'hello',
        value: 'javascript',
      });

      // check before if its in memory
      const checkBefore = await sut.get<Variable>(Variable, { key: 'hello' });
      expect(checkBefore).toEqual(createdVariable);

      // update
      await sut.update<Variable>(
        Variable,
        {
          value: 'TypeScript',
        },
        {
          key: 'hello',
        }
      );

      // check after if its changed in memory
      const checkAfter = await sut.get<Variable>(Variable, { key: 'hello' });
      expect(checkAfter).toEqual({
        key: 'hello',
        value: 'TypeScript',
        _version_: 2,
      });

      done();
    },
    15 * 1000
  );

  it(
    'update() - updates (memory-)entity in memory and after block commit even in db',
    async done => {
      await saveGenesisBlock(sut);

      const createdVariable = await sut.create<Variable>(Variable, {
        key: 'hello',
        value: 'first',
      });

      // save to block
      const block1 = createBlock(String(1));
      sut.beginBlock(block1);
      await sut.commitBlock();

      // change now in memory and then let block commit write changes to db
      const changedVariable = await sut.update<Variable>(
        Variable,
        {
          value: 'second',
        },
        {
          key: 'hello',
        }
      );

      // now it should be changed in memory
      const restulInMemory = await sut.get<Variable>(Variable, {
        key: 'hello',
      });
      expect(restulInMemory).toEqual({
        key: 'hello',
        value: 'second',
        _version_: 2,
      });

      // but not yet changed in the db
      const resultInDb = await sut.findOne<Variable>(Variable, {
        condition: {
          key: 'hello',
        },
      });
      expect(resultInDb).toEqual({
        key: 'hello',
        value: 'first',
        _version_: 1,
      });

      // now write changes to db
      const block2 = await createBlock(String(2));
      sut.beginBlock(block2);
      await sut.commitBlock();

      // now changes in memory should still be in _version_: 2
      const resultInMemory2 = await sut.get<Variable>(Variable, {
        key: 'hello',
      });
      expect(resultInMemory2).toEqual({
        key: 'hello',
        value: 'second',
        _version_: 2,
      });

      // but changes in db should also be _version_: 2
      const resultInDb2 = await sut.findOne<Variable>(Variable, {
        condition: {
          key: 'hello',
        },
      });
      expect(resultInDb2).toEqual({
        key: 'hello',
        value: 'second',
        _version_: 2,
      });

      done();
    },
    15 * 1000
  );

  it('update() - update 2 or more properties at once (in memory)', async done => {
    await saveGenesisBlock(sut);

    const createdAccount = await sut.create<Account>(Account, {
      address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
      gny: String(0),
      username: null,
    });

    // check before update
    const checkBefore = await sut.load<Account>(Account, {
      address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
    });
    expect(checkBefore).toMatchObject({
      gny: String(0),
      username: null,
    });

    // now update two properties at once
    await sut.update<Account>(
      Account,
      {
        gny: String(20),
        username: 'liang',
      },
      {
        address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
      }
    );

    // check after update
    const checkAfter = await sut.load<Account>(Account, {
      address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
    });
    expect(checkAfter).toMatchObject({
      gny: String(20),
      username: 'liang',
    });

    done();
  }, 5000);

  it(
    'update() - update 2 or more properties at once (in db)',
    async done => {
      await saveGenesisBlock(sut);

      const createdAccount = await sut.create<Account>(Account, {
        address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
        gny: String(0),
        username: null,
      });

      // now update two properties at once
      await sut.update<Account>(
        Account,
        {
          gny: String(20),
          username: 'liang',
        },
        {
          address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
        }
      );

      // save to block
      const block1 = createBlock(String(1));
      sut.beginBlock(block1);
      await sut.commitBlock();

      // check result in db
      const result = await sut.findOne<Account>(Account, {
        condition: {
          address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
        },
      });

      expect(result).toMatchObject({
        gny: String(20),
        username: 'liang',
      });

      done();
    },
    10 * 1000
  );

  it.skip('update() - is it possible to update your key? (what if key already exists - in cache or in db????)', async done => {
    done();
  });
  it.skip('update() - is it possible to update your composite key? (what if composite key already exists - in cache or in db???)', async done => {
    done();
  });
  it.skip('update() - is it possible to update one of the unique keys? (what if unique key is in cache or in db???)', async done => {
    done();
  });

  it.skip('update() - updates (not-in-memory-)entity in memory', async done => {
    done();
  });

  it.skip('update() - throws if to updated entity is not in cache', async done => {
    done();
  });

  it.skip('update() - when option checkModifier is enabled - throw if to updated property is not on the model', async done => {
    // use custom SmartDB to this test,

    await saveGenesisBlock(sut);

    const created = sut.create<Variable>(Variable, {
      key: 'hello',
      value: 'world1',
    });

    sut.update<Variable>(
      Variable,
      {
        value: 'world2',
      },
      {
        key: 'hello',
      }
    );

    done();
  });

  it.skip('update() - should return the changed property', async done => {
    done();
  });

  it('update() - should increase the _version_ for each call (also within one block)', async done => {
    await saveGenesisBlock(sut);

    const tid = randomBytes(32).toString('hex');
    const createdResult = await sut.create<Transfer>(Transfer, {
      tid: tid,
      amount: String(20 * 1e8),
      currency: 'AAA.AAA',
      recipientId: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
      senderId: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
      timestamp: 4125242,
      height: String(1),
    });

    // first update
    await sut.update<Transfer>(
      Transfer,
      {
        amount: String(25 * 1e8),
      },
      {
        tid: tid,
      }
    );

    // should now be _version_: 2
    const result1 = await sut.load<Transfer>(Transfer, { tid });
    expect(result1).toHaveProperty('_version_', 2);
    expect(result1).toHaveProperty('amount', String(25 * 1e8));

    // second update
    await sut.update<Transfer>(
      Transfer,
      {
        amount: String(30 * 1e8),
      },
      {
        tid: tid,
      }
    );

    // should now be _version_: 3
    const result2 = await sut.load<Transfer>(Transfer, { tid });
    expect(result2).toHaveProperty('_version_', 3);
    expect(result2).toHaveProperty('amount', String(30 * 1e8));

    // save to db
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // check after block saving
    const result3 = await sut.findOne<Transfer>(Transfer, {
      condition: { tid },
    });
    expect(result3).toHaveProperty('_version_', 3);
    expect(result3).toHaveProperty('amount', String(30 * 1e8));

    done();
  });
});
