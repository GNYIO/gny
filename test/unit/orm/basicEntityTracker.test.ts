import { jest } from '@jest/globals';

import {
  LoadChangesHistoryAction,
  BasicEntityTracker,
  EntityChanges,
} from '@gny/database-postgres';
import { LRUEntityCache } from '@gny/database-postgres';
import { ModelSchema, MetaSchema } from '@gny/database-postgres';
import { LogManager } from '@gny/database-postgres';
import { ILogger, IAccount } from '@gny/interfaces';
import { generateAddress } from '@gny/utils';
import { randomBytes } from 'crypto';

function createEntityChanges(account: string, username: string) {
  const value: EntityChanges[] = [
    {
      type: 1,
      model: 'Account',
      primaryKey: {
        address: account,
      },
      dbVersion: 1,
      propertyChanges: [
        {
          name: 'address',
          current: account,
        },
        {
          name: 'username',
          current: username,
        },
        {
          name: 'gny',
          current: String(0),
        },
      ],
    },
  ];
  return value;
}

function getMetaSchemaWithBigNumberPrimaryKey() {
  const testMetaSchema: MetaSchema = {
    memory: false,
    name: 'Test',
    indices: [
      {
        isUnique: false, // primary key
        columns: [
          {
            propertyName: 'height',
          },
        ],
      },
    ],
    columns: [
      {
        name: 'height',
      },
      {
        name: 'transactionCount',
      },
    ],
  };
  return testMetaSchema;
}

function getAccountMetaSchema() {
  const accountMetaSchema: MetaSchema = {
    memory: false,
    name: 'Account',
    indices: [
      {
        isUnique: true,
        columns: [
          {
            propertyName: 'address',
          },
        ],
      },
      {
        isUnique: false,
        columns: [
          {
            propertyName: 'address',
          },
        ],
      },
      {
        isUnique: true,
        columns: [
          {
            propertyName: 'username',
          },
        ],
      },
    ],
    columns: [
      {
        name: 'address',
      },
      {
        name: 'username',
      },
      {
        name: 'gny',
        default: String(0),
      },
      {
        name: 'publicKey',
      },
      {
        name: 'secondPublicKey',
      },
      {
        name: 'isDelegate',
        default: 0,
      },
      {
        name: 'isLocked',
        default: 0,
      },
      {
        name: 'lockHeight',
        default: String(0),
      },
      {
        name: 'lockAmount',
        default: String(0),
      },
    ],
  };
  return accountMetaSchema;
}

function createAccount(username: string) {
  const publicKey = createHexString(32);
  const address = generateAddress(publicKey);
  const account: IAccount = {
    address,
    username,
    gny: String(0),
    publicKey,
    secondPublicKey: null,
    isDelegate: 0,
    isLocked: 0,
    lockHeight: null,
    lockAmount: null,
  };
  return account;
}

function createHexString(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

describe('orm - BasicEntityTracker', () => {
  let sut: BasicEntityTracker;
  let schemas: Map<string, ModelSchema>;

  beforeEach(() => {
    const globalLogger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };
    LogManager.setLogger(globalLogger);

    const modelSchemas = new Map<string, ModelSchema>();

    const accountMetaSchema = getAccountMetaSchema();
    const accountModelSchema = new ModelSchema(accountMetaSchema);
    modelSchemas.set('Account', accountModelSchema);

    const testMetaSchema = getMetaSchemaWithBigNumberPrimaryKey();
    const testModelSchema = new ModelSchema(testMetaSchema);
    modelSchemas.set('Test', testModelSchema);

    const lruEntityCache = new LRUEntityCache(modelSchemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: string, till: string) => {
      return Promise.resolve(new Map<string, EntityChanges[]>());
    };
    sut = new BasicEntityTracker(
      lruEntityCache,
      modelSchemas,
      MAXVERSIONHOLD,
      logger,
      onLoadHistory
    );
    schemas = modelSchemas;
  });
  afterEach(() => {
    sut = undefined;
  });

  it('prop confirming - after creation is confirming -> false', done => {
    expect(sut.isConfirming).toEqual(false);
    done();
  });
  it('prop confirming - after beginConfirm() is confirming -> true', done => {
    sut.beginConfirm();
    expect(sut.isConfirming).toEqual(true);
    done();
  });

  it('initVersion(height) loads changes from old blocks', async () => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory: LoadChangesHistoryAction = async (
      from: string,
      till: string
    ) => {
      const history = new Map<string, EntityChanges[]>();
      const height_0 = String(0);
      history.set(height_0, [
        {
          type: 1,
          model: 'Account',
          primaryKey: {
            address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
          },
          dbVersion: 1,
          propertyChanges: [
            {
              name: 'address',
              current: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
            },
            {
              name: 'username',
              current: 'liangpeili',
            },
            {
              name: 'gny',
              current: String(0),
            },
          ],
        },
      ]);

      return Promise.resolve(history);
    };

    const mockOnLoadHistory = jest
      .fn<LoadChangesHistoryAction>()
      .mockImplementation(onLoadHistory);
    const customSut = new BasicEntityTracker(
      lruEntityCache,
      schemas,
      MAXVERSIONHOLD,
      logger,
      mockOnLoadHistory
    );

    await customSut.initVersion(String(0));

    expect(customSut.getHistoryByVersion(String(0)).length).toEqual(1);
    expect(mockOnLoadHistory).toBeCalledTimes(1);
    expect(mockOnLoadHistory).toBeCalledWith(String(0), String(0));
  });

  it('initVersion(height) loads all blocks up to height', async () => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: string, till: string) => {
      const history = new Map<string, EntityChanges[]>();
      history.set(
        String(0),
        createEntityChanges('G3igL8sTPQzNquy87bYAR37NoYRNn', 'zero')
      );
      history.set(
        String(1),
        createEntityChanges('G3y6swmiyCguASMfm46yyUrKWv17w', 'one')
      );
      history.set(
        String(2),
        createEntityChanges('G3yepz3vN85RcbGa9WwyvWG4YseBy', 'two')
      );
      history.set(
        String(3),
        createEntityChanges('G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr', 'three')
      );
      history.set(
        String(4),
        createEntityChanges('Gwwsn2BHCTPswfPkv4bQAPzgs8Gr', 'four')
      );
      history.set(
        String(5),
        createEntityChanges('G4WuRoNbDfPKgBPDB3nUqQdAs91Rd', 'five')
      );

      return Promise.resolve(history);
    };

    const mockOnLoadHistory = jest
      .fn<LoadChangesHistoryAction>()
      .mockImplementation(onLoadHistory);
    const customSut = new BasicEntityTracker(
      lruEntityCache,
      schemas,
      MAXVERSIONHOLD,
      logger,
      mockOnLoadHistory
    );
    const LOAD_UP_TO_HEIGHT = String(5);
    await customSut.initVersion(LOAD_UP_TO_HEIGHT);

    expect(mockOnLoadHistory).toBeCalledTimes(1);

    expect(customSut.getHistoryByVersion(String(0)).length).toEqual(1);
    expect(customSut.getHistoryByVersion(String(1)).length).toEqual(1);
    expect(customSut.getHistoryByVersion(String(2)).length).toEqual(1);
    expect(customSut.getHistoryByVersion(String(3)).length).toEqual(1);
    expect(customSut.getHistoryByVersion(String(4)).length).toEqual(1);
    expect(customSut.getHistoryByVersion(String(5)).length).toEqual(1);
  });

  it('initVersion(height) does not load if other block was already set', async () => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: string, till: string) => {
      const history = new Map<string, EntityChanges[]>();
      return Promise.resolve(history);
    };

    const mockOnLoadHistory = jest
      .fn<LoadChangesHistoryAction>()
      .mockImplementation(onLoadHistory);
    const customSut = new BasicEntityTracker(
      lruEntityCache,
      schemas,
      MAXVERSIONHOLD,
      logger,
      mockOnLoadHistory
    );

    // first accept random block height
    customSut.acceptChanges(String(0));

    // then try to load blocks up to block 5
    const LOAD_UP_TO_HEIGHT = String(5);
    customSut.initVersion(LOAD_UP_TO_HEIGHT);
    expect(mockOnLoadHistory).toBeCalledTimes(0);
  });

  it('trackNew("Account")', done => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');
    sut.trackNew(accountModelSchema, data);

    expect(sut.getConfirmedChanges().length).toEqual(1);
    done();
  });

  it('trackNew() throws if called twice', done => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');

    sut.trackNew(accountModelSchema, data); // once
    expect(() => sut.trackNew(accountModelSchema, data)).toThrow(); // twice
    done();
  });

  it('trackNew() returns entity with set default values', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'xpgeng',
      gny: String(0),
    };

    const accountModelSchema = schemas.get('Account');

    const expected: IAccount = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'xpgeng',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      _version_: 1,
    };

    const result = sut.trackNew(accountModelSchema, data);
    expect(result).toEqual(expected);
    done();
  });

  it('changes after trackNew("Account")', done => {
    const data: IAccount = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: String(0),
      publicKey:
        '06080f836e63cfb10516153b97f27a18177637d9b40665b2f1f08b41ad08946a',
      secondPublicKey: null,
      isDelegate: 0,
      isLocked: 0,
      lockHeight: String(0),
      lockAmount: String(0),
    };
    const accountModelSchema = schemas.get('Account');

    sut.trackNew(accountModelSchema, data);

    const expected: EntityChanges = {
      type: 1,
      model: 'Account',
      primaryKey: {
        address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      },
      dbVersion: 1,
      propertyChanges: [
        {
          name: 'address',
          current: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
        },
        {
          name: 'username',
          current: 'liangpeili',
        },
        {
          name: 'gny',
          current: String(0),
        },
        {
          name: 'publicKey',
          current:
            '06080f836e63cfb10516153b97f27a18177637d9b40665b2f1f08b41ad08946a',
        },
        {
          name: 'secondPublicKey',
          current: null,
        },
        {
          name: 'isDelegate',
          current: 0,
        },
        {
          name: 'isLocked',
          current: 0,
        },
        {
          name: 'lockHeight',
          current: String(0),
        },
        {
          name: 'lockAmount',
          current: String(0),
        },
      ],
    };
    expect(sut.getConfirmedChanges().length).toEqual(1);
    expect(sut.getConfirmedChanges()[0]).toEqual(expected);
    done();
  });

  // why does the _version_ property doesn't get tracked??
  it('trackModify()', done => {
    const data: IAccount = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: String(0),
      publicKey:
        '06080f836e63cfb10516153b97f27a18177637d9b40665b2f1f08b41ad08946a',
      secondPublicKey: null,
      isDelegate: 0,
      isLocked: 0,
      lockHeight: String(0),
      lockAmount: String(0),
    };
    const accountModelSchema = schemas.get('Account');

    const returnedNew = sut.trackNew(accountModelSchema, data);

    const changes: Partial<IAccount> = {
      gny: String(2000000),
    };
    sut.trackModify(accountModelSchema, returnedNew, changes);

    const expected: EntityChanges = {
      dbVersion: 2,
      model: 'Account',
      primaryKey: {
        address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      },
      propertyChanges: [
        {
          current: String(2000000),
          name: 'gny',
          original: String(0),
        },
        {
          current: 2,
          name: '_version_',
          original: 1,
        },
      ],
      type: 2,
    };

    expect(sut.getConfirmedChanges().length).toEqual(2);
    expect(sut.getConfirmedChanges()[1]).toEqual(expected);
    done();
  });

  it('trackModify() returns undefined', done => {
    const account = createAccount('liangpeili');

    const accountSchema = schemas.get('Account');
    const returnedNew = sut.trackNew(accountSchema, account);

    const modifier: Partial<IAccount> = {
      gny: String(20 * 1e8),
    };

    const result = sut.trackModify(accountSchema, returnedNew, modifier);
    expect(result).toBeUndefined();

    done();
  });

  it('trackDelete() without _version_', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };

    const accountSchema = schemas.get('Account');
    sut.trackDelete(accountSchema, data);

    const expected: EntityChanges = {
      dbVersion: undefined,
      model: 'Account',
      primaryKey: {
        address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      },
      propertyChanges: [
        {
          name: 'address',
          original: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
        },
      ],
      type: 3,
    };

    expect(sut.getConfirmedChanges().length).toEqual(1);
    expect(sut.getConfirmedChanges()[0]).toEqual(expected);
    done();
  });

  it('trackDelete() with _version_', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      _version_: 3,
    };

    const accountSchema = schemas.get('Account');
    sut.trackDelete(accountSchema, data);

    const expected: EntityChanges = {
      dbVersion: 3,
      model: 'Account',
      primaryKey: {
        address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      },
      propertyChanges: [
        {
          name: 'address',
          original: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
        },
      ],
      type: 3,
    };

    expect(sut.getConfirmedChanges().length).toEqual(1);
    expect(sut.getConfirmedChanges()[0]).toEqual(expected);
    done();
  });

  it('trackDelete() returns undefined', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };

    const accountSchema = schemas.get('Account');
    const returnedData = sut.trackDelete(accountSchema, data);

    expect(returnedData).toBeUndefined();
    done();
  });

  it('trackDelete() removes entity from cache', done => {
    const data: Partial<IAccount> = {
      address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
      username: 'liangpeili',
      gny: String(0),
    };
    const key: Partial<IAccount> = {
      address: data.address,
    };

    const accountSchema = schemas.get('Account');

    const entityIsNowTracked = sut.trackNew(accountSchema, data);
    // @ts-ignore
    expect(sut.getTrackingEntity(accountSchema, key).address).toEqual(
      data.address
    ); // first check

    sut.trackDelete(accountSchema, entityIsNowTracked);
    expect(sut.getTrackingEntity(accountSchema, key)).toBeUndefined(); // second check
    done();
  });

  it('trackPersistent() tracks no changes', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: String(0),
      _version_: 2,
    };

    const accountSchema = schemas.get('Account');
    sut.trackPersistent(accountSchema, data);

    expect(sut.getConfirmedChanges().length).toEqual(0);
    done();
  });

  it('trackPersistent() returns same data but not same reference', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: String(0),
      _version_: 2,
    };

    const accountSchema = schemas.get('Account');
    const returnedValue = sut.trackPersistent(accountSchema, data);

    expect(returnedValue).toEqual(data);
    expect(returnedValue).not.toBe(data);

    expect(returnedValue.gny).toEqual(data.gny);
    expect(typeof returnedValue.gny).toEqual('string');
    expect(typeof data.gny).toEqual('string');
    done();
  });

  it('trackPersistent() throws if called twice', done => {
    const data: Partial<IAccount> = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: String(0),
      _version_: 2,
    };

    const accountSchema = schemas.get('Account');
    sut.trackPersistent(accountSchema, data);
    expect(() => sut.trackPersistent(accountSchema, data)).toThrow();

    done();
  });

  it('historyVersions - is min: "-1", max: "-1" after initialization', done => {
    expect(sut.historyVersion).toEqual({
      min: String(-1),
      max: String(-1),
    });
    done();
  });

  it.skip('historyVersion', done => {
    sut.beginConfirm();
    sut.confirm();

    // sut.beginConfirm()
    // sut.confirm();

    // sut.beginConfirm();
    // sut.cancelConfirm();

    done();
  });

  it('acceptChanges(10) should set history for block height 10', done => {
    const data: Partial<IAccount> = {
      address: 'G2S8FueDjrk3jN7pkeui7VmrA8eMU',
      username: 'a1300',
      gny: String(0),
    };
    const accountSchema = schemas.get('Account');
    sut.trackNew(accountSchema, data);

    const resultBefore = sut.getHistoryByVersion(String(10), false);
    expect(resultBefore).toBeUndefined();

    sut.acceptChanges(String(10));

    const result = sut.getHistoryByVersion(String(10), false);
    expect(result).toBeTruthy();
    expect(result.length).toEqual(1);
    expect(result[0].primaryKey).toEqual({
      address: 'G2S8FueDjrk3jN7pkeui7VmrA8eMU',
    });

    done();
  });

  it('getChangesUntil() - loads EntityChanges from DB', async () => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');

    const history1 = new Map<string, EntityChanges[]>();
    history1.set(
      String(5),
      createEntityChanges('G3igL8sTPQzNquy87bYAR37NoYRNn', 'zero')
    );
    history1.set(
      String(6),
      createEntityChanges('G3y6swmiyCguASMfm46yyUrKWv17w', 'one')
    );
    history1.set(
      String(7),
      createEntityChanges('G3yepz3vN85RcbGa9WwyvWG4YseBy', 'two')
    );
    history1.set(
      String(8),
      createEntityChanges('G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr', 'three')
    );
    history1.set(
      String(9),
      createEntityChanges('Gwwsn2BHCTPswfPkv4bQAPzgs8Gr', 'four')
    );
    history1.set(
      String(10),
      createEntityChanges('G4WuRoNbDfPKgBPDB3nUqQdAs91Rd', 'five')
    );

    const history2 = new Map<string, EntityChanges[]>();
    history2.set(
      String(4),
      createEntityChanges('G3SSkWs6UFuoVHU3N4rLvXoobbQCt', 'zeroMinusOne')
    );

    // on first call return "history1", on second call return "history2"
    const mockOnLoadHistory = jest
      .fn<LoadChangesHistoryAction>()
      .mockReturnValueOnce(Promise.resolve(history1))
      .mockReturnValueOnce(Promise.resolve(history2));

    const customSut = new BasicEntityTracker(
      lruEntityCache,
      schemas,
      MAXVERSIONHOLD,
      logger,
      mockOnLoadHistory
    );

    await customSut.initVersion(String(10));

    // act
    const result = await customSut.getChangesUntil(String(4));

    expect(mockOnLoadHistory).toBeCalledTimes(2);
    expect(result).toBeTruthy();
    expect(result).toHaveLength(7);

    // make sure that the EntityChanges from the Height 4 are present
    const expectedFirstPrimaryKey = {
      address: 'G3SSkWs6UFuoVHU3N4rLvXoobbQCt',
    };
    expect(result[0].primaryKey).toEqual(expectedFirstPrimaryKey);
    expect(mockOnLoadHistory).nthCalledWith(2, String(4), String(5));
  });

  it('populate unconfirmedChanges during isConfirming phase', done => {
    expect(sut.isConfirming).toEqual(false);
    sut.beginConfirm();
    expect(sut.isConfirming).toEqual(true);

    const data: Partial<IAccount> = {
      address: 'G3DDP47cyZiLi6nrm7kzbdvAqK5Cz',
      username: 'liangpeili',
    };
    const accountSchema = schemas.get('Account');
    sut.trackNew(accountSchema, data);

    expect(sut.getUnconfirmedChanges().length).toEqual(1);

    sut.confirm();
    expect(sut.isConfirming).toEqual(false);

    expect(sut.getUnconfirmedChanges.length).toEqual(0);

    done();
  });

  it('getTrackingEntity() by primary key', done => {
    const data: Partial<IAccount> = {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      username: 'liangpeili',
    };
    const accountSchema = schemas.get('Account');
    sut.trackNew(accountSchema, data);

    const expected: IAccount = {
      _version_: 1,
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };

    const key: Partial<IAccount> = {
      address: data.address,
    };
    expect(sut.getTrackingEntity(accountSchema, key)).toEqual(expected);
    done();
  });

  it('getTrackingEntity() by unique constraint (unique column)', done => {
    const data: Partial<IAccount> = {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      username: 'liangpeili',
    };
    const accountSchema = schemas.get('Account');
    sut.trackNew(accountSchema, data);

    const expected: IAccount = {
      _version_: 1,
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };

    const key: Partial<IAccount> = {
      username: data.username,
    };
    expect(sut.getTrackingEntity(accountSchema, key)).toEqual(expected);
    done();
  });

  it('getTrackingEntity() still works for cached entities after block is accepted', done => {
    const data: Partial<IAccount> = {
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      username: 'liangpeili',
    };
    const accountSchema = schemas.get('Account');
    sut.trackNew(accountSchema, data);

    // accept changes for block 0
    sut.acceptChanges(String(0));

    // is entity still tracked?
    const expected: IAccount = {
      _version_: 1,
      address: 'GH7ZBNjRXCoJwRN8ddws37V3jEmn',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };

    const key: Partial<IAccount> = {
      address: data.address,
    };
    expect(sut.getTrackingEntity(accountSchema, key)).toEqual(expected);
    done();
  });

  it('rejectChanges() rejects all unconfirmed changes', done => {
    const data: Partial<IAccount> = {
      address: 'GuGD9McasETcrw7tEcBfoz9UiYZs',
      username: 'liangpeili',
      gny: String(0),
    };
    const accountSchema = schemas.get('Account');

    sut.beginConfirm();

    sut.trackNew(accountSchema, data);
    expect(sut.getUnconfirmedChanges().length).toEqual(1);

    // act
    sut.rejectChanges();

    expect(sut.getUnconfirmedChanges().length).toEqual(0);
    expect(sut.getConfirmedChanges().length).toEqual(0);
    expect(sut.getTrackingEntity(accountSchema, data)).toBeUndefined();
    done();
  });

  it('rejectChanges() correctly sets isConfirming to false', done => {
    expect(sut.isConfirming).toEqual(false);

    sut.beginConfirm();
    expect(sut.isConfirming).toEqual(true);

    sut.rejectChanges();
    expect(sut.isConfirming).toEqual(false);
    done();
  });

  it('rejectChanges() correctly updates cache after trackNew()', done => {
    const accountSchema = schemas.get('Account');
    const data: Partial<IAccount> = {
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      username: 'liangpeili',
      gny: String(0),
    };
    const primaryKey: Partial<IAccount> = {
      address: data.address,
    };
    const uniqueKey: Partial<IAccount> = {
      username: data.username,
    };

    sut.beginConfirm();
    sut.trackNew(accountSchema, data);

    // before rejectChanges()
    const expected: IAccount = {
      _version_: 1,
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toEqual(expected);
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toEqual(expected);

    // act
    sut.rejectChanges();

    // after rejectChanges()
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toBeUndefined();
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toBeUndefined();
    done();
  });

  it('rejectChanges() correctly updates cache after trackModify()', done => {
    const accountSchema = schemas.get('Account');
    const data: Partial<IAccount> = {
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      username: 'liangpeili',
      gny: String(0),
    };
    const primaryKey: Partial<IAccount> = {
      address: data.address,
    };
    const uniqueKey: Partial<IAccount> = {
      username: data.username,
    };

    sut.beginConfirm();
    const trackedDat = sut.trackNew(accountSchema, data);
    sut.confirm();
    sut.acceptChanges(String(0));

    sut.beginConfirm();

    // before trackModify
    const expectedAfterNew: IAccount = {
      // is the same as trackedDat
      _version_: 1,
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toEqual(
      expectedAfterNew
    );
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toEqual(
      expectedAfterNew
    );

    // modify
    sut.trackModify(accountSchema, trackedDat, { gny: String(900000) });

    // before rejectChanges()
    const updatedData: IAccount = {
      _version_: 2, // changed
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      gny: String(900000), // changed
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toEqual(
      updatedData
    );
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toEqual(
      updatedData
    );

    // act
    sut.rejectChanges();

    // after rejectChanges() (data should be like before the modify)
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toEqual(
      expectedAfterNew
    );
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toEqual(
      expectedAfterNew
    );

    done();
  });

  // test will fail because after the trackDelete() the cached entity is missing the _version_ property
  it.skip('rejectChanges() correctly updates cache after trackDelete()', done => {
    const accountSchema = schemas.get('Account');
    const data: Partial<IAccount> = {
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      username: 'liangpeili',
      gny: String(0),
    };
    const primaryKey = {
      address: data.address,
    };
    const uniqueKey = {
      username: data.username,
    };

    sut.beginConfirm();
    const trackedData = sut.trackNew(accountSchema, data);
    sut.confirm();
    // @ts-ignore
    sut.acceptChanges(0);

    // check before delete
    const expected: IAccount = {
      _version_: 1,
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      gny: String(0),
      isDelegate: 0,
      isLocked: 0,
      lockAmount: String(0),
      lockHeight: String(0),
      username: 'liangpeili',
    };
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toEqual(expected);
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toEqual(expected);

    // trackDelete()
    sut.beginConfirm();
    sut.trackDelete(accountSchema, trackedData);

    // now data should be not available in cache
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toBeUndefined();
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toBeUndefined();

    // act
    sut.rejectChanges();

    // after rejectChanges() data should be available again
    expect(sut.getTrackingEntity(accountSchema, primaryKey)).toEqual(expected);
    expect(sut.getTrackingEntity(accountSchema, uniqueKey)).toEqual(expected);
    done();
  });

  it('rejectChanges() does not affect already saved block changes', done => {
    sut.acceptChanges(String(0));
    sut.acceptChanges(String(1));

    sut.beginConfirm();
    const accountSchema = schemas.get('Account');
    const data: Partial<IAccount> = {
      address: 'Gsc5hAVNut3YBLfQLXrbBPAWe2fb',
      username: 'liangpeili',
      gny: String(1000),
    };
    const trackedData = sut.trackNew(accountSchema, data);
    sut.confirm();
    sut.acceptChanges(String(2));

    // test before
    expect(sut.getHistoryByVersion(String(0)).length).toEqual(0);
    expect(sut.getHistoryByVersion(String(1)).length).toEqual(0);
    expect(sut.getHistoryByVersion(String(2)).length).toEqual(1);

    sut.beginConfirm();
    sut.trackModify(accountSchema, trackedData, { gny: String(2000) });
    sut.rejectChanges();

    expect(sut.isConfirming).toEqual(false);
    expect(sut.getUnconfirmedChanges().length).toEqual(0);
    expect(sut.getConfirmedChanges().length).toEqual(0);

    // test after
    expect(sut.getHistoryByVersion(String(0)).length).toEqual(0);
    expect(sut.getHistoryByVersion(String(1)).length).toEqual(0);
    expect(sut.getHistoryByVersion(String(2)).length).toEqual(1);

    done();
  });

  it.skip('rollbackChanges()', done => {
    // sut.rollbackChanges()
    done();
  });
  it.skip('automatically clear block-history after exceeding maxCachedBlocks', done => {
    done();
  });
  it.skip('getHistoryByVersion() creates an empty entry if second parameter is true', done => {
    done();
  });
  it.skip('test MAXVERSIONHOLD', done => {
    done();
  });
});
