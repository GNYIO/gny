import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { IDelegate } from '../../../packages/interfaces';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/src/entity/Account';
import { Delegate } from '../../../packages/database-postgres/src/entity/Delegate';
import { saveGenesisBlock, logger } from './smartDB.test.helpers';
import { Balance } from '../../../packages/database-postgres/src/entity/Balance';
import { credentials } from './databaseCredentials';

describe('smartDB.getAll()', () => {
  let sut: SmartDB;

  beforeEach(done => {
    (async () => {
      await lib.resetDb();

      sut = new SmartDB(logger, credentials);
      await sut.init();

      done();
    })();
  }, lib.oneMinute);

  afterEach(done => {
    (async () => {
      await sut.close();
      done();
    })();
  }, lib.oneMinute);

  it('getAll() - throws if Model has not memory:true activated', async done => {
    await saveGenesisBlock(sut);

    const getAllPromise = sut.getAll<Account>(Account);
    expect(getAllPromise).rejects.toThrowError(
      'getAll only supports memory models'
    );
    done();
  });

  it('getAll() - returns all cached items of one model', async done => {
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
    done();
  });

  it('getAll() - returns not same reference', async done => {
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
    done();
  });

  it('getAll() - returns empty array if no entities are found in cache', async done => {
    await saveGenesisBlock(sut);

    const result = await sut.getAll<Balance>(Balance);
    expect(result).toEqual([]);

    done();
  });
});
