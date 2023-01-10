import { SmartDB } from '@gny/database-postgres';
import { IAccount, IDelegate, IBalance } from '@gny/interfaces';
import * as lib from '../lib';
import { Account } from '@gny/database-postgres';
import { Balance } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { saveGenesisBlock, logger } from './smartDB.test.helpers';
import { Asset } from '@gny/database-postgres';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.get()', () => {
  const dbName = 'getdb';
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

  it('get() - throws if Model has not memory:true activated', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const getAllPromise = sut.get<Account>(Account, {
      address: 'G28aWzLNE7AgJG3w285Zno9wLo88c',
    });
    return expect(getAllPromise).rejects.toThrowError(
      'get only supports memory models'
    );
  });

  it('get() - composite keys can be any order to find entity', async () => {
    expect.assertions(2);

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
  });

  it('get() - getting by entity from cache by composite key (if entity is untracked it returns undefined)', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const key = {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      currency: 'RRR.EEE',
    };
    const result = await sut.get<Balance>(Balance, key);

    expect(result).toBeUndefined();
  });

  it('get() - returns undefined when not found in cache', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const key = {
      name: 'AAA.AAA',
    };
    const result = await sut.get<Asset>(Asset, key);

    expect(result).toBeUndefined();
  });

  it('get() - loads entity from cache (if tracked returns entity)', async () => {
    expect.assertions(1);

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
  });

  it('get() - loads entity from cache (by unique key)', async () => {
    expect.assertions(1);

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
  });

  it('get() - loads entity from cache - throws if not provided whole composite key', async () => {
    expect.assertions(1);

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
