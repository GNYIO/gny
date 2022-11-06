import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import { IAccount, IBalance } from '../../../packages/interfaces';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/src/entity/Account';
import { Balance } from '../../../packages/database-postgres/src/entity/Balance';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  createAccount,
} from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { cloneDeep } from 'lodash';

describe('smartDB.findOne', () => {
  const dbName = 'findonedb';
  let sut: SmartDB;
  const credentials = cloneDeep(oldCredentials);
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

  it('findOne() - throws if no params object is provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    // satisfy compiler
    const wrongParams = undefined as FindOneOptions<Account>;

    const resultPromise = sut.findOne<Account>(Account, wrongParams);
    return expect(resultPromise).rejects.toThrowError(
      'params object was not provided'
    );
  });

  it('findOne() - throws if no condition object is provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    // satisfy compiler by first casting to "unknown"
    const wrongCondition = ({
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
    } as unknown) as FindOneOptions<Account>;

    const resultPromise = sut.findOne<Account>(Account, wrongCondition);

    return expect(resultPromise).rejects.toThrowError(
      'condition object was not provided'
    );
  });

  it('findOne() - load entity from DB by primary key', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const account1 = createAccount('G3SSkWs6UFuoVHU3N4rLvXoobbQCt');
    await sut.create<Account>(Account, account1);

    const account2 = createAccount('G26gsyu1VkF1z4JJ6UGa5VTa4wdWj');
    await sut.create<Account>(Account, account2);

    const account3 = createAccount('G3DDP47cyZiLi6nrm7kzbdvAqK5Cz');
    await sut.create<Account>(Account, account3);

    // persist changes to dB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const expected: Account = {
      address: 'G26gsyu1VkF1z4JJ6UGa5VTa4wdWj',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      publicKey: null,
      secondPublicKey: null,
      username: null,
      _version_: 1,
    };

    const key: Partial<IAccount> = {
      address: 'G26gsyu1VkF1z4JJ6UGa5VTa4wdWj',
    };
    const result: IAccount = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(result).toEqual(expected);
  });

  it('findOne() - load entity from DB by unique key', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const account = createAccount('G26gsyu1VkF1z4JJ6UGa5VTa4wdWj');
    account.username = 'xpgeng';
    await sut.create<Account>(Account, account);

    // persist changes to dB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const expected: IAccount = {
      address: 'G26gsyu1VkF1z4JJ6UGa5VTa4wdWj',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      publicKey: null,
      secondPublicKey: null,
      username: 'xpgeng',
      _version_: 1,
    };

    const key: Partial<IAccount> = {
      username: 'xpgeng',
    };
    const result: IAccount = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(result).toEqual(expected);
  });

  it('findOne() - load entity from DB by composite key', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    // prepare data
    const balance1: IBalance = {
      address: 'G2QvwiGhjbG5xPixfzstB9qxBqep6',
      currency: 'FFF.FFF',
      balance: String(1000),
      flag: 1,
    };
    const createdBalance1: IBalance = await sut.create<Balance>(
      Balance,
      balance1
    );

    const balance2: IBalance = {
      address: 'GRgor74w6tEZJ2hSVQkS5yCNKjmg',
      currency: 'ABC.ABC',
      balance: String(200000),
      flag: 1,
    };
    const createdBalance2: IBalance = await sut.create<Balance>(
      Balance,
      balance2
    );

    const balance3: IBalance = {
      address: 'G4LNZorUUGjt3rimMv5Cr2zod9PoS',
      currency: 'GGG.GGG',
      balance: String(300000),
      flag: 1,
    };
    const createdBalance3: IBalance = await sut.create<Balance>(
      Balance,
      balance3
    );

    // persist changes to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const compositeKey: Partial<IBalance> = {
      address: 'GRgor74w6tEZJ2hSVQkS5yCNKjmg',
      currency: 'ABC.ABC',
    };
    const result: IBalance = await sut.findOne<Balance>(Balance, {
      condition: compositeKey,
    });
    expect(result).toEqual(createdBalance2);
  });

  it('findOne() should not look into the cache', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const account1 = createAccount('G4LNZorUUGjt3rimMv5Cr2zod9PoS');
    await sut.create<Account>(Account, account1);

    const account2 = createAccount('G2QP6FBxZj19bzdBKKWxW8xoUo2vx');
    await sut.create<Account>(Account, account2);

    const account3 = createAccount('G3igL8sTPQzNquy87bYAR37NoYRNn');
    await sut.create<Account>(Account, account3);

    // do not persist changes (changes are only in cache)

    const key: Partial<IAccount> = {
      address: 'G2QP6FBxZj19bzdBKKWxW8xoUo2vx',
    };
    const result = await sut.findOne<Account>(Account, {
      condition: key,
    });
    expect(result).toBeUndefined();
  });

  it('findOne() - throws if more than one 1 entity is found', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const balance1: IBalance = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'ABC.ABC',
      balance: String(1),
      flag: 1,
    };
    const balance2: IBalance = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
      currency: 'CCC.DDD', // same address, other currency
      balance: String(1),
      flag: 1,
    };

    await sut.create<Balance>(Balance, balance1);
    await sut.create<Balance>(Balance, balance2);

    // persist changes to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const notFullKey: Partial<IBalance> = {
      address: 'G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN',
    };
    const findOnePromise = sut.findOne<Balance>(Balance, {
      condition: notFullKey,
    });
    return expect(findOnePromise).rejects.toEqual(
      new Error(
        'many entities found ( model = \'Balance\' , params = \'{"condition":{"address":"G2DU9TeVsWcAKr4Yj4Tefa8U3cZFN"}}\' )'
      )
    );
  });

  it('findOne() - returns undefined when no entity is found', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const result = await sut.findOne<Account>(Account, {
      condition: {
        address: 'G2AA8KFjYGSWN6MWH3wNspA43oSSD',
      },
    });
    expect(result).toBeUndefined();
  });
});
