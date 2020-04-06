import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { IAccount, IDelegate } from '../../../packages/interfaces';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/src/entity/Account';
import { Balance } from '../../../packages/database-postgres/src/entity/Balance';
import { Delegate } from '../../../packages/database-postgres/src/entity/Delegate';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { credentials } from './databaseCredentials';

describe('smartDB.increase', () => {
  let sut: SmartDB;

  beforeAll(done => {
    (async () => {
      await lib.stopAndKillPostgres();
      await lib.sleep(500);

      done();
    })();
  }, lib.oneMinute);

  beforeEach(done => {
    (async () => {
      // stopping is safety in case a test before fails
      await lib.stopAndKillPostgres();
      await lib.spawnPostgres();
      sut = new SmartDB(logger, credentials);
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

    await sut.create<Delegate>(Delegate, data);

    await sut.increase<Delegate>(
      Delegate,
      {
        producedBlocks: String(2),
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      }
    );

    const result = await sut.get<Delegate>(Delegate, {
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

    await sut.create<Delegate>(Delegate, data);

    await sut.increase<Delegate>(
      Delegate,
      {
        producedBlocks: String(2),
        missedBlocks: String(1),
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      }
    );

    const result = await sut.get<Delegate>(Delegate, {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    });
    expect(result.producedBlocks).toEqual(String(2));
    expect(result.missedBlocks).toEqual(String(1));
    done();
  });

  it('increase() - by composite primary key', async done => {
    await saveGenesisBlock(sut);

    const balance1 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
      balance: String(1),
    };
    await sut.create<Balance>(Balance, balance1);

    const balance2 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD', // same address, other currency
      balance: String(1),
    };
    await sut.create<Balance>(Balance, balance2);

    // increase only balance1
    await sut.increase<Balance>(
      Balance,
      {
        balance: String(1),
      },
      {
        address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
        currency: 'ABC.ABC',
      }
    );

    const result1 = await sut.get<Balance>(Balance, {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
    });
    const result2 = await sut.get<Balance>(Balance, {
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
    await sut.create<Account>(Account, data);

    await sut.increase<Account>(
      Account,
      {
        gny: String(-1000),
      },
      {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      }
    );

    const result = await sut.load<Account>(Account, {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    });
    const resultFromDb = await sut.findOne<Account>(Account, {
      condition: {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      },
    });
    expect(result.gny).toEqual(String(3000));
    expect(resultFromDb).toBeUndefined();

    done();
  });

  it('increase() - returns partial object with changed values', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(4000),
    } as IAccount;
    await sut.create<Account>(Account, data);

    const result = await sut.increase<Account>(
      Account,
      {
        gny: String(3000),
      },
      {
        address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      }
    );

    expect(result).toEqual({
      gny: String(7000),
    });

    done();
  });

  it('increase() - updates first cache and on block-commit writes changes to db', async done => {
    await saveGenesisBlock(sut);

    const createdBalance = await sut.create<Balance>(Balance, {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      currency: 'AAA.EEE',
      balance: String(20000),
      flag: 1,
    });

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // increase by x
    const updatedAccount = await sut.increase<Balance>(
      Balance,
      {
        balance: String(10000),
      },
      {
        address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
        currency: 'AAA.EEE',
      }
    );

    // check before increase happend only in cache
    const checkBeforeMemory = await sut.get<Balance>(Balance, {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      currency: 'AAA.EEE',
    });
    expect(checkBeforeMemory).toHaveProperty('balance', String(30000));
    expect(checkBeforeMemory).toHaveProperty('_version_', 2);

    const checkBeforeDB = await sut.findOne<Balance>(Balance, {
      condition: {
        address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
        currency: 'AAA.EEE',
      },
    });
    expect(checkBeforeDB).toHaveProperty('balance', String(20000));
    expect(checkBeforeDB).toHaveProperty('_version_', 1);

    // now write changes to db
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // check after increase was written to db
    const checkAfterMemory = await sut.get<Balance>(Balance, {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      currency: 'AAA.EEE',
    });
    expect(checkAfterMemory).toHaveProperty('balance', String(30000));
    expect(checkAfterMemory).toHaveProperty('_version_', 2);

    const checkAfterDB = await sut.findOne<Balance>(Balance, {
      condition: {
        address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
        currency: 'AAA.EEE',
      },
    });
    expect(checkAfterDB).toHaveProperty('balance', String(30000));
    expect(checkAfterDB).toHaveProperty('_version_', 2);

    done();
  });
});
