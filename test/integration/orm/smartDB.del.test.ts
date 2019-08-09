import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { IBalance } from '../../../src/interfaces';
import * as fs from 'fs';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/entity/Account';
import { Balance } from '../../../packages/database-postgres/entity/Balance';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { Delegate } from '../../../packages/database-postgres/entity/Delegate';

describe('smartDB.del', () => {
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

  it('del() - deletes entity from cache (memory model)', async done => {
    await saveGenesisBlock(sut);

    const delegate = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(0),
    };
    await sut.create<Delegate>(Delegate, delegate);

    // check before
    const before = await sut.get<Delegate>(Delegate, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(before).toBeTruthy();

    // delete
    await sut.del<Delegate>(Delegate, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });

    // check after
    const after = await sut.get<Delegate>(Delegate, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(after).toBeUndefined();

    done();
  });

  it('del() - deletes entity from cache (normal model)', async done => {
    await saveGenesisBlock(sut);

    const account = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(0),
    };
    await sut.create<Account>(Account, account);

    // check before
    const before = await sut.load<Account>(Account, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(before).toBeTruthy();
    const beforeInDb = await sut.findOne<Account>(Account, {
      condition: {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      },
    });
    expect(beforeInDb).toBeUndefined();

    // delete
    await sut.del<Account>(Account, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });

    // check after
    const after = await sut.load<Account>(Account, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    expect(after).toBeUndefined();
    const afterInDb = await sut.findOne<Account>(Account, {
      condition: {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      },
    });
    expect(afterInDb).toBeUndefined();

    done();
  });

  it('del() - delet unique key (memory model)', async done => {
    await saveGenesisBlock(sut);

    const delegate = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(0),
      tid: 'someLongId',
    };
    await sut.create<Delegate>(Delegate, delegate);

    // check before
    const before = await sut.get<Delegate>(Delegate, {
      tid: 'someLongId',
    });
    expect(before).toBeTruthy();

    // delete
    await sut.del<Delegate>(Delegate, {
      tid: 'someLongId',
    });

    // check after
    const after = await sut.get<Delegate>(Delegate, {
      tid: 'someLongId',
    });
    expect(after).toBeUndefined();

    done();
  });

  it('del() - delete by unique key (normal model)', async done => {
    await saveGenesisBlock(sut);

    const account = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      username: 'a1300',
      gny: String(0),
    };
    await sut.create<Account>(Account, account);

    // check before
    const before = await sut.load<Account>(Account, {
      username: 'a1300',
    });
    expect(before).toBeTruthy();

    // delete
    await sut.del<Account>(Account, {
      username: 'a1300',
    });

    // check after
    const after = await sut.load<Account>(Account, {
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
    const created: IBalance = await sut.create<Balance>(Balance, balance);

    // check before
    const compositeKey = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      currency: 'ABC.ABC',
    };
    const before = await sut.get<Balance>(Balance, compositeKey);
    expect(before).toEqual(created);

    // delete
    await sut.del<Balance>(Balance, compositeKey);

    // check after
    const after = await sut.get<Balance>(Balance, compositeKey);
    expect(after).toBeUndefined();

    done();
  });

  it('del() - deletes entity from DB after beginBlock() and commitBlock()', async done => {
    await saveGenesisBlock(sut);

    const account = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'a1300',
      gny: String(0),
    };
    await sut.create<Account>(Account, account);

    // first create account and persist with next block
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // before: check how many accounts exist
    const before = await sut.count<Account>(Account, {});
    expect(before).toEqual(1);

    const key = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
    };
    await sut.del<Account>(Account, key);

    // then delete account and persist with next block
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // after: check how many accounts exist
    const after = await sut.count<Account>(Account, {});
    expect(after).toEqual(0);

    done();
  });
});
