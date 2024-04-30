import { SmartDB } from '@gnyio/database-postgres';
import { IAccount, IAsset } from '@gnyio/interfaces';
import * as lib from '../lib';
import { Account } from '@gnyio/database-postgres';
import { Asset } from '@gnyio/database-postgres';
import { Balance } from '@gnyio/database-postgres';
import { Versioned } from '@gnyio/database-postgres';
import { saveGenesisBlock, logger, createBlock } from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gnyio/base';

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
  }, lib.tenSeconds * 5);

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

    // create() does not return the same object reference
    const dataSameAsCreateResult = data === createResult;
    expect(dataSameAsCreateResult).toEqual(false);

    // but values are the same
    expect(createResult).toEqual(expected);
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

  it.skip('create() - throws if not all mandatory properties are provided', async () => {
    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);

    const asset = {
      name: 'ABC.ABC',
    } as IAsset;

    await sut.create<Asset>(Asset, asset);
    await sut.commitBlock();
  });

  // new Bug ticket: should throw if passed in wrong properties!
  it.skip('create() - throws if unnecessary properties are provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);

    const asset = ({
      name: 'ABC.ABC',
      hello: 'this is a wrong property',
    } as unknown) as IAsset;

    const createPromise = sut.create<Asset>(Asset, asset);

    return expect(createPromise).rejects.toBe('passed in wrong property');
  });

  it.skip('create() - throws if trying to add _version_ property to input', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const first = createBlock(String(1));
    sut.beginBlock(first);

    const account = {
      address: 'G3avVDiYyPRkzVWZ4QTW93yoJZMXg',
      _version_: 10, // illegal
    };

    const createPromise = sut.create<Account>(Account, account);
    return expect(createPromise).rejects.toEqual('not allowed');
  });

  it.skip('create() - throws if _version_ is provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);

    const data = {
      currency: 'ABC.ABC',
      address: 'G3EviK1p98D9EoXUeb8K3bRTW5goT',
      balance: String(10),
      flag: 1,
      _version_: 5,
    };
    const createPromise = sut.create<Balance>(Balance, data);

    return expect(createPromise).rejects.toThrow(
      '_version_ property not allowed'
    );
  });
});
