import { SmartDB } from '@gny/database-postgres';
import * as lib from '../lib';
import { Account } from '@gny/database-postgres';
import { Variable } from '@gny/database-postgres';
import { Delegate } from '@gny/database-postgres';
import { Condition } from '@gny/database-postgres';
import { saveGenesisBlock, createBlock, logger } from './smartDB.test.helpers';
import { Balance } from '@gny/database-postgres';
import { credentials as oldCredentials } from './databaseCredentials';
import { copyObject } from '@gny/base';

describe('smartDB.count', () => {
  const dbName = 'countdb';
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

  it('count() - throws if no condition is passed in', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const condition = undefined as Condition<Delegate>;
    const resultPromise = sut.count<Delegate>(Delegate, condition);

    return expect(resultPromise).rejects.toThrowError(
      'condition object was not provided'
    );
  });

  it('count() - no account -> returns count 0', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const key = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.count<Account>(Account, key);
    expect(result).toEqual(0);
  });

  it('count() - after save -> returns count 1', async () => {
    expect.assertions(2);

    await saveGenesisBlock(sut);

    const delegate1 = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
      username: 'liangpeili',
      producedBlocks: String(0),
      tid: '73e561d1b5e3f3035066c914933bc904e071b5b66fae2a537a1757acda5bd324',
      publicKey:
        '9768bbc2e290ae5a32bb9a57124de4f8a1b966d41683b6cdf803f8ada582210f',
    };
    await sut.create<Delegate>(Delegate, delegate1);
    const delegate2 = {
      address: 'G2t7A6cwnAgpGpMnYKf4S4pSGiu2Z',
      username: 'a1300',
      producedBlocks: String(0),
      tid: '83eb6ec4816447361e193ba40dd05bd5f3d195ada8601aa9360ce84b031117a1',
      publicKey:
        '25ec60819608f3efc6433e2d8defd369b50959f12e0a042d0aa013056f585722',
    };
    await sut.create<Delegate>(Delegate, delegate2);

    // need to save block in order to save changes to DB
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const key = {
      address: 'G4GNdWmigYht2C9ipfexSzn67mLZE',
    };
    const result = await sut.count<Delegate>(Delegate, key);
    expect(result).toEqual(1);

    const result2 = await sut.count<Delegate>(Delegate, {});
    expect(result2).toEqual(2);
  });

  it('count() - WHERE IN clause ($in)', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const variable1 = await sut.create<Variable>(Variable, {
      key: 'hello1',
      value: 'world1',
    });
    const variable2 = await sut.create<Variable>(Variable, {
      key: 'hello2',
      value: 'world2',
    });
    const variable3 = await sut.create<Variable>(Variable, {
      key: 'hello3',
      value: 'world3',
    });

    // save to db
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const result = await sut.count<Variable>(Variable, {
      key: {
        $in: ['hello2', 'hello3'],
      },
    });
    expect(result).toEqual(2);
  });

  it('count() - count all entities in db', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    const result = await sut.count<Balance>(Balance, {});
    expect(result).toEqual(0);
  });

  it('count() - $gte and $lte', async () => {
    expect.assertions(1);

    await saveGenesisBlock(sut);

    await sut.create<Balance>(Balance, {
      address: 'GWP4yELJeDszNZeVKxDhXwici22C',
      balance: String(1),
      currency: 'AAA.AAA',
      flag: 1,
    });
    await sut.create<Balance>(Balance, {
      address: 'Gh9YghqP1yADqoPtNFoG2vZJGf4i',
      balance: String(2),
      currency: 'AAA.AAA',
      flag: 1,
    });
    await sut.create<Balance>(Balance, {
      address: 'G2id1mqqMjJfGASp3tSsL9Ua7rxT7',
      balance: String(3),
      currency: 'AAA.AAA',
      flag: 1,
    });
    await sut.create<Balance>(Balance, {
      address: 'G238kA37G5qfXCKed8mpRMudjwzcn',
      balance: String(4),
      currency: 'AAA.AAA',
      flag: 1,
    });

    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const result = await sut.count<Balance>(Balance, {
      balance: {
        $gte: String(2),
        $lte: String(3),
      },
    });
    expect(result).toEqual(2);
  });
});
