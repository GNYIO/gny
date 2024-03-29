import { SmartDB } from '@gny/database-postgres';
import { IAsset, ITransaction, IBalance } from '@gny/interfaces';
import * as lib from '../lib';
import { Account } from '@gny/database-postgres';
import { Balance } from '@gny/database-postgres';
import { Asset } from '@gny/database-postgres';
import { Transaction } from '@gny/database-postgres';
import { FindAllOptions } from '@gny/database-postgres';
import {
  saveGenesisBlock,
  createBlock,
  logger,
  createAccount,
  createAsset,
  createTransaction,
} from './smartDB.test.helpers';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.findAll()', () => {
  const dbName = 'findalldb';
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

  it('findAll() - throws if no params object is provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    // satisfy compiler
    const wrongParams = undefined as FindAllOptions<Account>;

    const resultPromise = sut.findAll<Account>(Account, wrongParams);
    return expect(resultPromise).rejects.toThrowError(
      'params object was not provided'
    );
  });

  it('findAll() - throws if no condition object is provided', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    // satisfy compiler by first casting to "unknown"
    const wrongCondition = ({
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
    } as unknown) as FindAllOptions<Account>;

    const resultPromise = sut.findAll<Account>(Account, wrongCondition);

    return expect(resultPromise).rejects.toThrowError(
      'condition object was not provided'
    );
  });

  it('findAll() - works with generics', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const account1 = createAccount('G3igL8sTPQzNquy87bYAR37NoYRNn');
    const created1 = await sut.create<Account>(Account, account1);

    const account2 = createAccount('G3y6swmiyCguASMfm46yyUrKWv17w');
    const created2 = await sut.create<Account>(Account, account2);

    const account3 = createAccount('G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr');
    const created3 = await sut.create<Account>(Account, account3);

    // persist changes
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const result = await sut.findAll<Account>(Account, {
      condition: {
        address: {
          $in: [
            'G3igL8sTPQzNquy87bYAR37NoYRNn',
            'G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr',
          ],
        },
      },
      sort: {
        address: -1,
      },
    });

    const expected1 = {
      ...created1,
      publicKey: null,
      secondPublicKey: null,
      username: null,
    };

    const expected3 = {
      ...created3,
      publicKey: null,
      secondPublicKey: null,
      username: null,
    };

    const expected = [expected1, expected3];
    expect(result).toEqual(expected);
  });

  it('findAll() - access directly DB, no cache read', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    // populate cache with one entity
    const account = {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      username: 'xpgeng',
      gny: String(100000),
    };
    await sut.create<Account>(Account, account);

    const result = await sut.findAll<Account>(Account, {
      condition: {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      },
    });
    expect(result).toEqual([]);
    expect(result.length).toEqual(0);
  });

  it('findAll() - WHERE clause', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    await sut.create<Balance>(Balance, {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      currency: 'ABC.ABC',
      balance: String(100000),
      flag: 1,
    } as IBalance);
    await sut.create<Balance>(Balance, {
      address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      currency: 'FEE.FEE',
      balance: String(400000),
      flag: 1,
    } as IBalance);
    await sut.create<Balance>(Balance, {
      address: 'G2S8FueDjrk3jN7pkeui7VmrA8eMU',
      currency: 'TEST.TEST',
      balance: String(20000),
      flag: 1,
    });

    // save changes to block and persist to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // findAll balance lines for one address
    const result: IBalance[] = await sut.findAll<Balance>(Balance, {
      condition: {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
      },
    });

    const expected: Balance[] = [
      {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
        currency: 'ABC.ABC',
        balance: String(100000),
        flag: 1,
        _version_: 1,
      },
      {
        address: 'G4JQ4cTQ7tjkF7yopQfTnaSkeHEqn',
        currency: 'FEE.FEE',
        balance: String(400000),
        flag: 1,
        _version_: 1,
      },
    ];
    expect(result).toEqual(expected);
  });

  it('findAll() - WHERE IN clause ($in)', async () => {
    expect.assertions(3);

    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC = await sut.create<Asset>(Asset, abc);

    const tec = createAsset('TEC.TEC');
    await sut.create<Asset>(Asset, tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // check if 2 Assets exist
    const count = await sut.count<Asset>(Asset, {});
    expect(count).toEqual(2);

    // load only one
    const names = ['ABC.ABC'];
    const result = await sut.findAll<Asset>(Asset, {
      condition: {
        name: {
          $in: names,
        },
      },
    });

    expect(result).toHaveLength(1);
    expect(result).toEqual([createdABC]);
  });

  it('findAll() - limit', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    await sut.create<Asset>(Asset, abc);

    const tec = createAsset('TEC.TEC');
    await sut.create<Asset>(Asset, tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    // load both normal
    const both: IAsset[] = await sut.findAll<Asset>(Asset, {
      condition: {},
    });
    expect(both.length).toEqual(2);

    // load only one with limit
    const limit: IAsset[] = await sut.findAll<Asset>(Asset, {
      condition: {},
      limit: 1,
    });
    expect(limit.length).toEqual(1);
  });

  it('findAll() - limit and offset', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC: IAsset = await sut.create<Asset>(Asset, abc);

    const tec = createAsset('TEC.TEC');
    const createdTEC: IAsset = await sut.create<Asset>(Asset, tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const loadFirst = await sut.findAll<Asset>(Asset, {
      condition: {},
      limit: 1,
      offset: 0,
    });
    const loadSecond = await sut.findAll<Asset>(Asset, {
      condition: {},
      limit: 1,
      offset: 1,
    });

    expect(loadFirst).toEqual([createdABC]);
    expect(loadSecond).toEqual([createdTEC]);
  });

  it('findAll() - sort results ASCENDING', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC: IAsset = await sut.create<Asset>(Asset, abc);

    const tec = createAsset('TEC.TEC');
    const createdTEC: IAsset = await sut.create<Asset>(Asset, tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.findAll<Asset>(Asset, {
      condition: {},
      sort: {
        name: 1,
      },
    });

    expect(result).toEqual([createdABC, createdTEC]);
  });

  it('findAll() - sort results DESCENDING', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const abc = createAsset('ABC.ABC');
    const createdABC: IAsset = await sut.create<Asset>(Asset, abc);

    const tec = createAsset('TEC.TEC');
    const createdTEC: IAsset = await sut.create<Asset>(Asset, tec);

    // persist Assets in DB with new block
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.findAll<Asset>(Asset, {
      condition: {},
      sort: {
        name: -1,
      },
    });

    expect(result).toEqual([createdTEC, createdABC]);
  });

  it('findAll() - search for a range of values with $gte and $lte', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    // save first transaction in block 1
    const trs1 = createTransaction(String(1));
    const createdTrs1: ITransaction = await sut.create<Transaction>(
      Transaction,
      trs1
    );
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    // save another transaction in block 2
    const trs2 = createTransaction(String(2));
    const createdTrs2 = await sut.create<Transaction>(Transaction, trs2);
    const block2 = createBlock(String(2));
    sut.beginBlock(block2);
    await sut.commitBlock();

    // load data directly from DB
    const minHeight = String(0);
    const maxHeight = String(1);
    const result = await sut.findAll<Transaction>(Transaction, {
      condition: {
        height: { $gte: minHeight, $lte: maxHeight },
      },
    });

    const expected = {
      ...createdTrs1,
      message: null,
      secondSignature: null,
    };

    expect(result).toEqual([expected]);
  });

  it('findAll() - returns empty array when no results were found', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const result = await sut.findAll<Account>(Account, {
      condition: {
        address: 'G2GqxTcotAe9QvNsekzm7ucNtppXV',
      },
    });
    expect(result).toEqual([]);
  });
});
