import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import * as fs from 'fs';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/entity/Account';
import { Variable } from '../../../packages/database-postgres/entity/Variable';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';

describe('smartDB.load()', () => {
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

  it('load() - loads (in-memory) entity from cache (if cached)', async done => {
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

    done();
  });

  it('load() - loads (normal) entity from cache (if cached)', async done => {
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

    done();
  });

  it('load() - loads correct entity from cache after it was updated in cache', async done => {
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

    done();
  });

  it(
    'load() - loads data from db when data is not cached',
    async done => {
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
      sut = new SmartDB(logger, {
        cachedBlockCount: 10,
        maxBlockHistoryHold: 10,
        configRaw: configRaw,
      });
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
      done();
    },
    2 * lib.oneMinute
  );

  it('load() - loads correct entity from cache by unique property', async done => {
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

    done();
  });

  it(
    'load() - loads correct entity from DB by unique property',
    async done => {
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
      sut = new SmartDB(logger, {
        cachedBlockCount: 10,
        maxBlockHistoryHold: 10,
        configRaw: configRaw,
      });
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
      done();
    },
    lib.oneMinute
  );

  it('load() - returns undefined when entity is not found in cache and not found in db', async done => {
    await saveGenesisBlock(sut);

    const result = await sut.load<Account>(Account, {
      address: 'G3wzRRCWnPX4MCUjTkWBxjbqVSXLL',
    });
    expect(result).toBeUndefined();

    done();
  });
});
