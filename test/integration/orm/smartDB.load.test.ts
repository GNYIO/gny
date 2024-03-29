import { SmartDB } from '@gny/database-postgres';
import * as lib from '../lib';
import { Account } from '@gny/database-postgres';
import { Variable } from '@gny/database-postgres';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.load()', () => {
  const dbName = 'loaddb';
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

  it('load() - loads (in-memory) entity from cache (if cached)', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const variable = await sut.create<Variable>(Variable, {
      key: 'hello',
      value: 'x',
    });

    const result = await sut.load<Variable>(Variable, {
      key: 'hello',
    });

    expect(result).toEqual({
      key: 'hello',
      value: 'x',
      _version_: 1,
    });
  });

  it('load() - loads (normal) entity from cache (if cached)', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const created = await sut.create<Account>(Account, {
      address: 'G23HXtWCUfV9FQV9JmvbTWsiU1w8S',
      gny: String(10 * 1e8),
      username: null,
    });

    const result = await sut.load<Account>(Account, {
      address: 'G23HXtWCUfV9FQV9JmvbTWsiU1w8S',
    });

    expect(result).toEqual({
      address: 'G23HXtWCUfV9FQV9JmvbTWsiU1w8S',
      gny: String(10 * 1e8),
      username: null,
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      _version_: 1,
    });
  });

  it('load() - loads correct entity from cache after it was updated in cache', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const createdVariable = await sut.create<Variable>(Variable, {
      key: 'hello',
      value: 'one',
    });

    await sut.update<Variable>(
      Variable,
      {
        value: 'two',
      },
      {
        key: 'hello',
      }
    );

    const result = await sut.load<Variable>(Variable, {
      key: 'hello',
    });

    expect(result).toEqual({
      key: 'hello',
      value: 'two',
      _version_: 2,
    });
  });

  it(
    'load() - loads data from db when data is not cached',
    async () => {
      expect.assertions(1);

      await saveGenesisBlock(sut);

      // const save account into db and then reconnect to db
      const account1 = await sut.create<Account>(Account, {
        address: 'G2XyMyiVFMZHZLsTidXRjCRxWpBPz',
        gny: String(10 * 1e8),
        username: null,
      });
      const account2 = await sut.create<Account>(Account, {
        address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
        gny: String(20 * 1e8),
        username: null,
      });
      const account3 = await sut.create<Account>(Account, {
        address: 'GtXXB4qRtwzngLYpHGGLGmbFBCTw',
        gny: String(30 * 1e8),
        username: null,
      });

      // persist new data in block
      const block1 = createBlock(String(1));
      sut.beginBlock(block1);
      await sut.commitBlock();

      // reconnect
      await sut.close();
      await lib.sleep(10 * 1000);
      sut = new SmartDB(logger, credentials);
      await sut.init();
      await lib.sleep(10 * 1000);

      // load data from db
      const result = await sut.load<Account>(Account, {
        address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
      });

      // check if data is correct
      expect(result).toEqual({
        address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
        gny: String(20 * 1e8),
        isDelegate: 0,
        isLocked: 0,
        lockAmount: String(0),
        lockHeight: String(0),
        publicKey: null,
        secondPublicKey: null,
        username: null,
        _version_: 1,
      });

      // do not close connection, that makes afterEach() for you
    },
    2 * lib.oneMinute
  );

  it('load() - loads correct entity from cache by unique property', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const account1 = await sut.create<Account>(Account, {
      address: 'G3NFhX7zT2aue1WhLHqAwaEnfdWnX',
      username: 'liang',
      gny: String(80 * 1e8),
    });
    const account2 = await sut.create<Account>(Account, {
      address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
      username: 'xpgeng',
      gny: String(30 * 1e8),
    });
    const account3 = await sut.create<Account>(Account, {
      address: 'G3DpbtT5QNF5smWYTyLTzJ8812SRx',
      username: 'a1300',
      gny: String(20 * 1e8),
    });

    const result = await sut.load<Account>(Account, {
      username: 'xpgeng',
    });

    expect(result).toEqual({
      address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
      gny: String(30 * 1e8),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'xpgeng',
      _version_: 1,
    });
  });

  it(
    'load() - loads correct entity from DB by unique property',
    async () => {
      expect.assertions(1);

      // prepare
      await saveGenesisBlock(sut);
      const account1 = await sut.create<Account>(Account, {
        address: 'G3NFhX7zT2aue1WhLHqAwaEnfdWnX',
        username: 'liang',
        gny: String(80 * 1e8),
      });
      const account2 = await sut.create<Account>(Account, {
        address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
        username: 'xpgeng',
        gny: String(30 * 1e8),
      });
      const account3 = await sut.create<Account>(Account, {
        address: 'G3DpbtT5QNF5smWYTyLTzJ8812SRx',
        username: 'a1300',
        gny: String(20 * 1e8),
      });

      // save new account to db
      const block1 = createBlock(String(1));
      sut.beginBlock(block1);
      await sut.commitBlock();

      // close connection and create new one
      await sut.close();
      await lib.sleep(10 * 1000);
      sut = new SmartDB(logger, credentials);
      await sut.init();

      // now load data from db
      const result = await sut.load<Account>(Account, {
        username: 'xpgeng',
      });
      expect(result).toEqual({
        address: 'G3u4EzpDU65jmqMPQLyQ9YREtFNUR',
        gny: String(30 * 1e8),
        isDelegate: 0,
        isLocked: 0,
        lockAmount: String(0),
        lockHeight: String(0),
        publicKey: null,
        secondPublicKey: null,
        username: 'xpgeng',
        _version_: 1,
      });

      // do not close connection, that makes afterEach() for you
    },
    lib.oneMinute
  );

  it('load() - returns undefined when entity is not found in cache and not found in db', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const result = await sut.load<Account>(Account, {
      address: 'G3wzRRCWnPX4MCUjTkWBxjbqVSXLL',
    });
    expect(result).toBeUndefined();
  });
});
