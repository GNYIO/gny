import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { IAccount, IDelegate, IBalance } from '../../../packages/interfaces';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/src/entity/Account';
import { Balance } from '../../../packages/database-postgres/src/entity/Balance';
import { Delegate } from '../../../packages/database-postgres/src/entity/Delegate';
import { saveGenesisBlock, logger } from './smartDB.test.helpers';
import { Asset } from '../../../packages/database-postgres/src/entity/Asset';
import { credentials as oldCredentials } from './databaseCredentials';
import { cloneDeep } from 'lodash';

describe('smartDB.get()', () => {
  const dbName = 'getdb';
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

  it('get() - throws if Model has not memory:true activated', async done => {
    await saveGenesisBlock(sut);

    const getAllPromise = sut.get<Account>(Account, {
      address: 'G28aWzLNE7AgJG3w285Zno9wLo88c',
    });
    expect(getAllPromise).rejects.toThrowError(
      'get only supports memory models'
    );
    done();
  });

  it('get() - composite keys can be any order to find entity', async done => {
    await saveGenesisBlock(sut);

    const balance = await sut.create<Balance>(Balance, {
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
      balance: String(20 * 1e8),
      currency: 'AAA.AAA',
      flag: 1,
    });

    const keyOrder1 = {
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
      currency: 'AAA.AAA',
    };

    const keyOrder2 = {
      currency: 'AAA.AAA',
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
    };

    const result1 = await sut.get<Balance>(Balance, keyOrder1);
    const result2 = await sut.get<Balance>(Balance, keyOrder2);

    const expected = {
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
      balance: String(20 * 1e8),
      currency: 'AAA.AAA',
      flag: 1,
      _version_: 1,
    };

    expect(result1).toEqual(expected);
    expect(result2).toEqual(expected);

    done();
  });

  it('get() - getting by entity from cache by composite key (if entity is untracked it returns undefined)', async done => {
    await saveGenesisBlock(sut);

    const key = {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      currency: 'RRR.EEE',
    };
    const result = await sut.get<Balance>(Balance, key);

    expect(result).toBeUndefined();
    done();
  });

  it('get() - returns undefined when not found in cache', async done => {
    await saveGenesisBlock(sut);

    const key = {
      name: 'AAA.AAA',
    };
    const result = await sut.get<Asset>(Asset, key);

    expect(result).toBeUndefined();
    done();
  });

  it('get() - loads entity from cache (if tracked returns entity)', async done => {
    await saveGenesisBlock(sut);

    const data = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
    } as IDelegate;
    const createdValue = await sut.create<Delegate>(Delegate, data);

    const key = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.get<Delegate>(Delegate, key);
    expect(result).toEqual({
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      _version_: 1,
    });
    done();
  });

  it('get() - loads entity from cache (by unique key)', async done => {
    await saveGenesisBlock(sut);

    const delegate = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      username: 'a1300',
    } as IAccount;
    const created = await sut.create<Delegate>(Delegate, delegate);

    const uniqueKey = {
      username: 'a1300',
    };
    const result = await sut.get<Delegate>(Delegate, uniqueKey);
    expect(result).toEqual(created);
    done();
  });

  it('get() - loads entity from cache - throws if not provided whole composite key', async () => {
    await saveGenesisBlock(sut);

    // first save data
    const balance: IBalance = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      currency: 'ABC.ABC',
      balance: String(2000),
      flag: 1,
    };
    await sut.create<Balance>(Balance, balance);

    const notWholeCompositeKey = {
      currency: 'ABC.ABC',
    };
    const getPromise = sut.get<Balance>(Balance, notWholeCompositeKey);
    return expect(getPromise).rejects.toEqual(
      new Error('no primary key of entity found')
    );
  });
});
