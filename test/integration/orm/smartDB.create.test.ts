import { SmartDB } from '@gny/database-postgres';
import { IAccount } from '@gny/interfaces';
import * as lib from '../lib';
import { Account } from '@gny/database-postgres';
import { Balance } from '@gny/database-postgres';
import { Versioned } from '@gny/database-postgres';
import { saveGenesisBlock, logger } from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.create()', () => {
  const dbName = 'createdb';
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

  it('create() - initial _version_ is 1 after creation', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const data = {
      address: 'GZr2NYvHqp9keXPVsAp6EDHTiT3y',
      gny: String(0),
    } as IAccount;
    const result = await sut.create<Account>(Account, data);
    expect(result).toBeTruthy();
    expect(result._version_).toEqual(1);
  }, 5000);

  it('create() - throws if Model was not registered', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    class ImaginaryEntity implements Versioned {
      name: string;
      _version_?: number;
    }

    const data = {
      name: 'imaginary name',
    };
    const createPromise = sut.create<ImaginaryEntity>(ImaginaryEntity, data);
    return expect(createPromise).rejects.toEqual(
      new Error("unregistered model 'ImaginaryEntity'")
    );
  }, 5000);

  it('create() - returns other object reference', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const data = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
    };
    const createResult = await sut.create<Account>(Account, data);

    const expected: IAccount = {
      _version_: 1,
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
    };

    expect(createResult).not.toBe(expected); // not same reference
    expect(createResult).toEqual(expected); // deepEquals (same values)
  });

  it('create() - throws if no primary key is provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const wrongData = {
      username: 'a1300', // but no property address
    };
    const createPromise = sut.create<Account>(Account, wrongData);
    return expect(createPromise).rejects.toEqual(
      new Error(
        "entity must contains primary key ( model = 'Account' entity = '[object Object]' )"
      )
    );
  });

  it('create() - throws if no complete composite key is provided if needed', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const wrongCompositeKeyData = {
      currency: 'ABC.ABC', // missing property address
    };
    const createPromise = sut.create<Balance>(Balance, wrongCompositeKeyData);
    return expect(createPromise).rejects.toEqual(
      new Error(
        "entity must contains primary key ( model = 'Balance' entity = '[object Object]' )"
      )
    );
  });

  it.skip('create() - throws if not all mandatory properties are provided', async done => {
    done();
  });

  it.skip('create() - throws if unnecessary properties are provided', async done => {
    done();
  });

  it.skip('create() - if mandatory property is missing, should throw (feature)', async done => {
    done();
  });
});
