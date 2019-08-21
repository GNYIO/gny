import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as fs from 'fs';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/entity/Account';
import { Variable } from '../../../packages/database-postgres/entity/Variable';
import { Transfer } from '../../../packages/database-postgres/entity/Transfer';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { randomBytes } from 'crypto';
import { Balance } from '../../../packages/database-postgres/entity/Balance';

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

  it('update() - throws if entity can be neither found in cache nor in db', async () => {
    await saveGenesisBlock(sut);

    const updatePromise = sut.update<Variable>(
      Variable,
      {
        value: 'hello',
      },
      {
        key: 'thisKeyDoesNotExist',
      }
    );

    return expect(updatePromise).rejects.toThrowError(
      'Entity not found ( model = \'Variable\', key = \'{"key":"thisKeyDoesNotExist"}\' )'
    );
  });

  it(
    'update() - entity gets loaded for update when it is not in cache but only in db (entity gets loaded for tracking)',
    async () => {
      // first create an entity and save it into the block
      // close the existing connection
      // then create a new SmartDB connection
      // and update the entity in the db
      // save the changes to the db
      // and check that the changes are in the db

      await saveGenesisBlock(sut);

      await sut.create<Account>(Account, {
        address: 'G4YTseNGcFQaLkDKbpjihQ3xsBCjm',
        gny: String(20000),
        username: null,
      });

      const block1 = createBlock(String(1));
      sut.beginBlock(block1);
      await sut.commitBlock();

      // reconnect
      await sut.close();
      await lib.sleep(10 * 1000);
      sut = new SmartDB(logger, {
        cachedBlockCount: 10,
        maxBlockHistoryHold: 10,
        configRaw: configRaw,
      });
      await sut.init();
      await lib.sleep(10 * 1000);

      await sut.update<Account>(
        Account,
        {
          username: 'liangpeili',
        },
        {
          address: 'G4YTseNGcFQaLkDKbpjihQ3xsBCjm',
        }
      );

      const block2 = createBlock(String(2));
      sut.beginBlock(block2);
      await sut.commitBlock();

      const result = await sut.findOne<Account>(Account, {
        condition: {
          address: 'G4YTseNGcFQaLkDKbpjihQ3xsBCjm',
        },
      });
      const expected: Account = {
        address: 'G4YTseNGcFQaLkDKbpjihQ3xsBCjm',
        gny: String(20000),
        username: 'liangpeili',
        isDelegate: 0,
        isLocked: 0,
        lockAmount: String(0),
        lockHeight: String(0),
        publicKey: null,
        secondPublicKey: null,
        _version_: 2,
      };
      expect(result).toEqual(expected);
    },
    25 * 1000
  );

  it.skip('update() - when option checkModifier is enabled - throw if to updated property is not on the model', async done => {
    // use custom SmartDB to this test,

    await saveGenesisBlock(sut);

    const created = await sut.create<Variable>(Variable, {
      key: 'hello',
      value: 'world1',
    });

    await sut.update<Variable>(
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

  it('update() - throws if property is not primary | composite | unique key ', async () => {
    await saveGenesisBlock(sut);

    const updatePromise = sut.update<Account>(
      Account,
      {
        gny: String(1000000),
      },
      {
        gny: String(0),
      }
    );

    return expect(updatePromise).rejects.toThrowError(
      'no primary key of entity found'
    );
  });

  it('update() - can update entity by unique key', async done => {
    await saveGenesisBlock(sut);

    const createdAccount = await sut.create<Account>(Account, {
      address: 'G2Ujin7eS9M857JxpnLVUpr6h6RmU',
      gny: String(2400000),
      username: 'xpgeng',
    });

    await sut.update<Account>(
      Account,
      {
        gny: String(3000000000),
      },
      {
        username: 'xpgeng',
      }
    );

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const resultFromCache = await sut.load<Account>(Account, {
      address: 'G2Ujin7eS9M857JxpnLVUpr6h6RmU',
    });
    const resultFromDb = await sut.findOne<Account>(Account, {
      condition: {
        address: 'G2Ujin7eS9M857JxpnLVUpr6h6RmU',
      },
    });

    const expectedInCache: Pick<
      Account,
      | 'address'
      | 'gny'
      | 'username'
      | 'isDelegate'
      | 'isLocked'
      | 'lockAmount'
      | 'lockHeight'
      | '_version_'
    > = {
      address: 'G2Ujin7eS9M857JxpnLVUpr6h6RmU',
      gny: String(3000000000),
      username: 'xpgeng',
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      _version_: 2,
    } as Account;

    const expectedFromDb: Account = {
      ...expectedInCache,
      publicKey: null,
      secondPublicKey: null,
    };

    expect(resultFromCache).toEqual(expectedInCache);
    expect(resultFromDb).toEqual(expectedFromDb);

    done();
  });

  it('update() - can update entity by composite key', async done => {
    await saveGenesisBlock(sut);

    const createdBalance = await sut.create<Balance>(Balance, {
      address: 'GhzUkDCedPD89mzawGujeacu9AkN',
      currency: 'REW.REW',
      balance: String(20000000),
      flag: 1,
    });

    await sut.update<Balance>(
      Balance,
      {
        balance: String(9000000000),
      },
      {
        address: 'GhzUkDCedPD89mzawGujeacu9AkN',
        currency: 'REW.REW',
      }
    );

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const expected: Balance = {
      address: 'GhzUkDCedPD89mzawGujeacu9AkN',
      currency: 'REW.REW',
      balance: String(9000000000),
      flag: 1,
      _version_: 2,
    };

    const resultFromCache = await sut.get<Balance>(Balance, {
      address: 'GhzUkDCedPD89mzawGujeacu9AkN',
      currency: 'REW.REW',
    });
    const resultFromDb = await sut.findOne<Balance>(Balance, {
      condition: {
        address: 'GhzUkDCedPD89mzawGujeacu9AkN',
        currency: 'REW.REW',
      },
    });

    expect(resultFromCache).toEqual(expected);
    expect(resultFromDb).toEqual(expected);

    done();
  });
});
