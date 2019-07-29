import {
  SmartDB,
  SmartDBOptions,
} from '../../../packages/database-postgres/src/smartDB';
import {
  IBlock,
  IAccount,
  IDelegate,
  IAsset,
  ITransaction,
  IVariable,
  IRound,
  IBalance,
} from '../../../src/interfaces';
import { generateAddress } from '../../../src/utils/address';
import { cloneDeep } from 'lodash';
import * as fs from 'fs';
import * as lib from '../lib';
import { Account } from '../../../packages/database-postgres/entity/Account';
import { Balance } from '../../../packages/database-postgres/entity/Balance';
import { Asset } from '../../../packages/database-postgres/entity/Asset';
import { Transaction } from '../../../packages/database-postgres/entity/Transaction';
import { Variable } from '../../../packages/database-postgres/entity/Variable';
import { Delegate } from '../../../packages/database-postgres/entity/Delegate';
import {
  Versioned,
  FindAllOptions,
  Condition,
} from '../../../packages/database-postgres/searchTypes';
import { Round } from '../../../packages/database-postgres/entity/Round';
import { Transfer } from '../../../packages/database-postgres/entity/Transfer';
import { Block } from '../../../packages/database-postgres/entity/Block';
import {
  createRandomBytes,
  saveGenesisBlock,
  createBlock,
  logger,
  CUSTOM_GENESIS,
  createAccount,
  createAsset,
  createTransaction,
} from './smartDB.test.helpers';
import { randomBytes } from 'crypto';

describe('smartDB.exists()', () => {
  let sut: SmartDB;
  let configRaw: string;

  beforeAll(done => {
    (async () => {
      await lib.stopAndKillPostgres();
      configRaw = fs.readFileSync('ormconfig.postgres.json', {
        encoding: 'utf8',
      });
      await lib.sleep(500);

      done();
    })();
  }, lib.oneMinute);

  beforeEach(done => {
    (async () => {
      // stopping is safety in case a test before fails
      await lib.stopAndKillPostgres();
      await lib.spawnPostgres();
      sut = new SmartDB(logger, {
        cachedBlockCount: 10,
        maxBlockHistoryHold: 10,
        configRaw: configRaw,
      });
      await sut.init();

      done();
    })();
  }, lib.oneMinute);

  afterEach(done => {
    (async () => {
      await sut.close();
      await lib.sleep(4 * 1000);
      await lib.stopAndKillPostgres();
      await lib.sleep(15 * 1000);

      done();
    })();
  }, lib.oneMinute);

  it('exists() - entity exists in DB after beginBlock()', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    const key = {
      id: block.id,
    };
    sut.beginBlock(block);
    await sut.commitBlock();

    const exists = await sut.exists<Block>(Block, key);
    expect(exists).toEqual(true);
    done();
  });

  it('exists() - entity does not exists in DB', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);

    const key = {
      id: 'notValidId',
    };
    const exists = await sut.exists<Block>(Block, key);
    expect(exists).toEqual(false);
    done();
  });

  it('exists() - can access item after createOrLoad() (false)', async done => {
    await saveGenesisBlock(sut);

    // create() or createOrLoad() does not save entity directly to DB
    const variable: IVariable = {
      key: 'key',
      value: 'value',
    };
    const vare = await sut.createOrLoad<Variable>(Variable, variable);

    const exists = await sut.exists<Variable>(Variable, { key: 'key' });
    expect(exists).toEqual(false);
    done();
  });

  it.skip('exists() - should it always hit the database?', async done => {
    done();
  });

  it('exists() - pass in Array[], should return true if one of the elements is in db', async done => {
    await saveGenesisBlock(sut);

    // create block to persist changes to db
    const transaction1: ITransaction = {
      type: 0,
      fee: String(0.1 * 1e8),
      timestamp: 0,
      senderId: 'GtXXB4qRtwzngLYpHGGLGmbFBCTw',
      senderPublicKey:
        '5d5be2685edb3b49c53acc68114e1e3fcf829f0f05a3eb6203642bf3615dc450',
      signatures: JSON.stringify([
        'c178e7619e8c9abdf3d039fc9f7b93af2f869c75b806ec580d985307a08bbe98c46c3f12102bdb920ca101c97300efedc80ee1403f0c53eee0d6da509e09c90c',
      ]),
      id: '981a56749865bc920ce1533556322fa3605b5513cc2a9eaab30ea8a2d4e3213a',
      args: JSON.stringify([30 * 1e8, 'G3HWZL5vryPZ5bHamaE9uFtwU3Gca']),
      height: String(1),
    };
    const transaction2: ITransaction = {
      type: 0,
      fee: String(0.1 * 1e8),
      timestamp: 0,
      senderId: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5',
      senderPublicKey:
        'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      signatures: JSON.stringify([
        '62d8eda0130fff84f75b7937421dff50bd4553b4e30a2ca01e4a8138a0442a6c48f50e45994c8c14d473f8e283f3daf05cc04532d8760cd581ee8660208f280b',
      ]),
      args: JSON.stringify([
        40000000000000000,
        'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
      ]),
      id: 'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
      height: String(1),
    };
    const transaction3: ITransaction = {
      type: 10,
      fee: String(0 * 1e8),
      timestamp: 0,
      senderId: 'G4QuND1h6n1AqF9jJsVQ1ehk5y1vS',
      senderPublicKey:
        '48dd4ed8d9a98c989d3c3a3846a3e178874dce65700755c997f511d74b9d2000',
      signatures: JSON.stringify([
        '3deea209829206f22df4729a9f2795812d81d0d55da7b9d0da6cb7cb8ced308b2368f409155f535cd027c9ba2817b7fbb10988b9678dcbc7937ef3a113199b04',
      ]),
      id: '13906840a802fda216d96a8b9fa9c0ddf5fe33c9552f1f2701ca9d59268ae8ca',
      args: JSON.stringify([50 * 1e8, 'G45bu64FwHeShUrty7viXpRUSfoiL']),
      height: String(1),
    };
    const createdTrans1 = await sut.create<Transaction>(
      Transaction,
      transaction1
    );
    const createdTrans2 = await sut.create<Transaction>(
      Transaction,
      transaction2
    );
    const createdTrans3 = await sut.create<Transaction>(
      Transaction,
      transaction3
    );

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.exists<Transaction>(Transaction, {
      id: [
        'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
        '0f9c04265f537f389e06aa74bb4c080f77154418ce826607374a3b82af7027ec',
      ],
    });
    expect(result).toEqual(true);

    done();
  });

  it('exists() - pass in Array[], should return false if no of the elements are in db', async done => {
    await saveGenesisBlock(sut);

    // the following transaction will be saved to the db
    const transaction: ITransaction = {
      type: 0,
      fee: String(0),
      timestamp: 0,
      senderId: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5',
      senderPublicKey:
        'bb7fc99aae209658bfb1987367e6881cdf648975438abd05aefd16ac214e4f47',
      signatures: JSON.stringify([
        '62d8eda0130fff84f75b7937421dff50bd4553b4e30a2ca01e4a8138a0442a6c48f50e45994c8c14d473f8e283f3daf05cc04532d8760cd581ee8660208f280b',
      ]),
      args: JSON.stringify([
        40000000000000000,
        'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
      ]),
      id: 'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
      height: String(1),
    };
    const createdTrans = await sut.create<Transaction>(
      Transaction,
      transaction
    );

    // create block to persist changes to db
    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.exists<Transaction>(Transaction, {
      id: [
        '9af76a7c85d5f3cb96b9d3b0dc81fdaba1cd5fe2a6722d0a364de02477e6a489',
        '0f9c04265f537f389e06aa74bb4c080f77154418ce826607374a3b82af7027ec',
      ],
    });
    expect(result).toEqual(false);

    done();
  });

  it('exists() - commit Block, now block should exist in DB', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);
    await sut.commitBlock();

    const result = await sut.exists<Block>(Block, {
      id: block.id,
    });
    expect(result).toEqual(true);

    done();
  });

  it('exists() - begin Block, now block should NOT exist in DB', async done => {
    await saveGenesisBlock(sut);

    const block = createBlock(String(1));
    sut.beginBlock(block);
    // no commitBlock() so block is only in memory and not in DB

    const result = await sut.exists<Block>(Block, {
      id: block.id,
    });
    expect(result).toEqual(false);

    done();
  });

  it('exists() - throws if two or more properties are searched after', async () => {
    await saveGenesisBlock(sut);

    const balance = await sut.create<Balance>(Balance, {
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
      balance: String(20 * 1e8),
      currency: 'AAA.AAA',
      flag: 1,
    });

    // save in block
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const key = {
      address: 'G49TFUujviHc8FxBc14pj7X7CJTLH',
      currency: 'BBB.BBB',
    };

    const resultPromise = sut.exists<Balance>(Balance, key);
    return expect(resultPromise).rejects.toThrowError(
      'only one property is allowed on WHERE clause'
    );
  });

  it('exists() - returns false when passed in undefined value', async done => {
    await saveGenesisBlock(sut);

    const result = await sut.exists<Account>(Account, {
      address: undefined,
    });
    expect(result).toEqual(false);

    done();
  });

  it('exists() - returns true when unique key was found in db', async done => {
    await saveGenesisBlock(sut);

    const account1 = await sut.create<Account>(Account, {
      address: 'GQ6hcPj74Tgj89KeCkQJGgUcCqLZ',
      gny: String(10 * 1e8),
      username: 'xpgeng',
    });
    const account2 = await sut.create<Account>(Account, {
      address: 'G45bu64FwHeShUrty7viXpRUSfoiL',
      gny: String(20 * 1e8),
      username: 'liang',
    });
    const account3 = await sut.create<Account>(Account, {
      address: 'G2t7A6cwnAgpGpMnYKf4S4pSGiu2Z',
      gny: String(30 * 1e8),
      username: 'a1300',
    });

    // save in Block
    const block1 = createBlock(String(1));
    sut.beginBlock(block1);
    await sut.commitBlock();

    const result = await sut.exists<Account>(Account, {
      username: 'liang',
    });
    expect(result).toEqual(true);

    done();
  });
});
