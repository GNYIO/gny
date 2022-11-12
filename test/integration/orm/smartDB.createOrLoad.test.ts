import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import {
  IAccount,
  IRound,
  IBalance,
  IVariable,
} from '../../../packages/interfaces';
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
import { credentials as oldCredentials } from './databaseCredentials';
import { cloneDeep } from 'lodash';

describe('smartDB.createOrLoad()', () => {
  const dbName = 'createorloaddb';
  let sut: SmartDB;
  const credentials = cloneDeep(oldCredentials);
  credentials.dbDatabase = dbName;

  beforeAll(done => {
    (async () => {
      await lib.dropDb(dbName);
      await lib.createDb(dbName);
      done();
    })();
  }, lib.tenSeconds);

  afterAll(done => {
    (async () => {
      await lib.dropDb(dbName);
      done();
    })();
  }, lib.tenSeconds);

  beforeEach(done => {
    (async () => {
      await lib.resetDb(dbName);

      sut = new SmartDB(logger, credentials);
      await sut.init();

      done();
    })();
  }, lib.tenSeconds);

  afterEach(done => {
    (async () => {
      await sut.close();

      done();
    })();
  }, lib.tenSeconds);

  it('createOrLoad() - create entity', async () => {
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

    expect.assertions(1);
  }, 5000);

  it('createOrLoad() - sets default properties', async () => {
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

    expect.assertions(1);
  }, 5000);

  it('createOrLoad() - load entity', async () => {
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

    expect.assertions(1);
  }, 5000);

  it('createOrLoad() - entity is tracked after operation', async () => {
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

    expect.assertions(2);
  });

  it('createOrLoad() - create entity with composite key', async () => {
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

    expect.assertions(2);
  });

  it('createOrLoad() - load entity by composite key', async () => {
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

    expect.assertions(1);
  });

  it.skip('createOrLoad() - this operation should cache entity and the entity should gets returned with sdb.get()', async done => {
    done();
  });

  it('createOrLoad() - after createOrLoad entity should be cached', async () => {
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

    expect.assertions(1);
  });
});
