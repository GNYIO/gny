import { SmartDB } from '@gny/database-postgres';
import { IDelegate } from '@gny/interfaces';
import * as lib from '../lib';
import { Account } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { saveGenesisBlock, logger } from './smartDB.test.helpers';
import { Balance } from '@gny/database-postgres';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.getAll()', () => {
  const dbName = 'getalldb';
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

  it('getAll() - throws if Model has not memory:true activated', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const getAllPromise = sut.getAll<Account>(Account);
    expect(getAllPromise).rejects.toThrowError(
      'getAll only supports memory models'
    );
  });

  it('getAll() - returns all cached items of one model', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const delegate1 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
    } as IDelegate;
    const result1 = await sut.create<Delegate>(Delegate, delegate1);

    const delegate2 = {
      address: 'G2EX4yLiTdqtn2bZRsTMWppvffkQ8',
      username: 'a1300',
    } as IDelegate;
    const result2 = await sut.create<Delegate>(Delegate, delegate2);

    const delegate3 = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'xpgeng',
    } as IDelegate;
    const result3 = await sut.create<Delegate>(Delegate, delegate3);

    const result = await sut.getAll<Delegate>(Delegate);
    const expected = [result3, result2, result1];

    expect(result).toEqual(expected);
  });

  it('getAll() - returns not same reference', async () => {
    expect.assertions(3);

    await saveGenesisBlock(sut);

    const delegate1 = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      username: 'liangpeili',
    } as IDelegate;
    const createdResult = await sut.create<Delegate>(Delegate, delegate1);

    const result = await sut.getAll<Delegate>(Delegate);

    expect(result.length).toEqual(1);
    expect(result[0]).toEqual(createdResult); // structure is the same
    expect(result[0]).not.toBe(createdResult); // reference is not the same
  });

  it('getAll() - returns empty array if no entities are found in cache', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const result = await sut.getAll<Balance>(Balance);
    expect(result).toEqual([]);
  });
});
