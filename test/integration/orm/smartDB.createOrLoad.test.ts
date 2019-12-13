import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import {
  IAccount,
  IRound,
  IBalance,
  IVariable,
} from '../../../packages/interfaces';
import * as fs from 'fs';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/src/entity/Account';
import { Balance } from '../../../packages/database-postgres/src/entity/Balance';
import { Round } from '../../../packages/database-postgres/src/entity/Round';
import {
  saveGenesisBlock,
  logger,
  createAccount,
} from './smartDB.test.helpers';
import { Variable } from '../../../packages/database-postgres/src/entity/Variable';

describe('smartDB.createOrLoad()', () => {
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

  it('createOrLoad() - create entity', async done => {
    await saveGenesisBlock(sut);

    const round: IRound = {
      fee: String(0),
      reward: String(0),
      round: String(1),
    };
    const result = await sut.createOrLoad<Round>(Round, round);

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

  it('createOrLoad() - sets default properties', async done => {
    await saveGenesisBlock(sut);

    const result = await sut.createOrLoad<Round>(Round, {
      round: String(5),
    });

    const expected = {
      create: true,
      entity: {
        round: String(5),
        reward: String(0),
        fee: String(0),
        _version_: 1,
      },
    };
    expect(result).toEqual(expected);

    done();
  }, 5000);

  it('createOrLoad() - load entity', async done => {
    await saveGenesisBlock(sut);

    const round: IRound = {
      fee: String(0),
      reward: String(0),
      round: String(1),
    };
    const createResult = await sut.createOrLoad<Round>(Round, round);

    const expected = {
      create: false,
      entity: {
        round: String(1),
        fee: String(0),
        reward: String(0),
        _version_: 1,
      },
    };

    const key = {
      round: String(1),
    };
    const loadResult = await sut.createOrLoad<Round>(Round, key);
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
    const createResult = await sut.createOrLoad<Round>(Round, round);

    // load only from cache
    const result = await sut.load<Round>(Round, {
      round: String(1),
    });
    const resultFromDb = await sut.findOne<Round>(Round, {
      condition: {
        round: String(1),
      },
    });
    expect(result).toEqual({
      fee: String(0),
      reward: String(0),
      round: String(1),
      _version_: 1,
    });
    expect(resultFromDb).toBeUndefined();

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
    const createdResult = await sut.createOrLoad<Balance>(Balance, balance);

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
    const key = {
      address: 'GBR31pwhxvsgtrQDfzRxjfoPB62r',
      currency: 'ABC.ABC',
    };
    const result = await sut.get<Balance>(Balance, key);
    expect(result).toEqual(expected);

    done();
  });

  it('createOrLoad() - load entity by composite key', async done => {
    await saveGenesisBlock(sut);

    const account = createAccount('Gjfw7B8WyHq7bw22TwG6gPtdXD19');
    const created = await sut.createOrLoad<Account>(Account, account);

    const key = {
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

    const result = await sut.createOrLoad<Account>(Account, key);
    expect(result).toEqual(expected);
    done();
  });

  it.skip('createOrLoad() - this operation should cache entity and the entity should gets returned with sdb.get()', async done => {
    done();
  });

  it('createOrLoad() - after createOrLoad entity should be cached', async done => {
    const variable: IVariable = {
      key: 'key',
      value: 'value',
    };
    const x = await sut.createOrLoad<Variable>(Variable, variable);

    const result = await sut.get<Variable>(Variable, { key: 'key' });
    expect(result).toEqual({
      _version_: 1,
      key: 'key',
      value: 'value',
    });
    done();
  });
});
