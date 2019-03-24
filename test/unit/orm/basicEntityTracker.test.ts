import { BasicEntityTracker, EntityChanges } from '../../../packages/database-postgres/src/basicEntityTracker';
import { LRUEntityCache } from '../../../packages/database-postgres/src/lruEntityCache';
import { ModelSchema, MetaSchema } from '../../../packages/database-postgres/src/modelSchema';
import { LogManager } from '../../../packages/database-postgres/src/logger';
import { ILogger } from '../../../src/interfaces';
import { generateAddress } from '../../../src/utils/address';
import { randomBytes } from 'crypto';

function getAccountMetaSchema() {
  const accountMetaSchema: MetaSchema = {
    memory: false,
    name: 'Account',
    indices: [{
      isUnique: true,
      columns: [{
        propertyName: 'address',
      }]
    }, {
      isUnique: false,
      columns: [{
        propertyName: 'address',
      }]
    }, {
      isUnique: true,
      columns: [{
        propertyName: 'username'
      }]
    }],
    columns: [
      {
        name: 'address',
      },
      {
        name: 'username'
      },
      {
        name: 'gny',
        default: 0,
      },
      {
        name: 'publicKey'
      },
      {
        name: 'secondPublicKey'
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
        default: 0,
      },
      {
        name: 'lockAmount',
        default: 0,
      },
    ]
  };
  return accountMetaSchema;
}

function createAccount(username: string) {
  const publicKey = createHexString(32);
  const address = generateAddress(publicKey);
  const account = {
    address,
    username,
    gny: 0,
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
      log: (x) => x,
      trace: (x) => x,
      debug: (x) => x,
      info: (x) => x,
      warn: (x) => x,
      error: (x) => x,
      fatal: (x) => x,
    };
    LogManager.setLogger(globalLogger);

    const modelSchemas = new Map<string, ModelSchema>();

    const accountMetaSchema = getAccountMetaSchema();
    const accountModelSchema = new ModelSchema(accountMetaSchema);
    modelSchemas.set('Account', accountModelSchema);

    const lruEntityCache = new LRUEntityCache(modelSchemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: number, till: number) => {
      return Promise.resolve(new Map<number, EntityChanges[]>());
    };
    sut = new BasicEntityTracker(lruEntityCache, modelSchemas, MAXVERSIONHOLD, logger, onLoadHistory);
    schemas = modelSchemas;
  });
  afterEach(() => {
    sut = undefined;
  });

  it.skip('creation', (done) => {
    done();
  });
  it('prop confirming - after creation is confirming -> false', (done) => {
    expect(sut.isConfirming).toEqual(false);
    done();
  });
  it('prop confirming - after beginConfirm() is confirming -> true', (done) => {
    sut.beginConfirm();
    expect(sut.isConfirming).toEqual(true);
    done();
  });
  it.skip('getHistoryByVersion', (done) => {
    done();
  });
  it('initVersion(height) loads changes from old blocks', async (done) => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: number, till: number) => {
      const history = new Map<number, EntityChanges[]>();
      const blockHeight = 0;
      history.set(blockHeight, [{
        type: 1,
        model: 'Account',
        primaryKey: {
          address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY'
        },
        dbVersion: 1,
        propertyChanges: [
          {
            name: 'address',
            current: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY'
          },
          {
            name: 'username',
            current: 'liangpeili'
          },
          {
            name: 'gny',
            current: 0
          }
        ]
      }]);

      return Promise.resolve(history);
    };

    const mockOnLoadHistory = jest.fn().mockImplementation(onLoadHistory);
    const customSut = new BasicEntityTracker(lruEntityCache, schemas, MAXVERSIONHOLD, logger, mockOnLoadHistory);

    await customSut.initVersion(0);

    expect(customSut.getHistoryByVersion(0).length).toEqual(1);
    expect(mockOnLoadHistory).toBeCalledTimes(1);
    expect(mockOnLoadHistory).toBeCalledWith(0, 0);
    done();
  });
  it('initVersion(height) loads all blocks up to height', async (done) => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: number, till: number) => {
      const createEntityChanges = (account: string, username: string) => {
        const value: EntityChanges[] = [{
          type: 1,
          model: 'Account',
          primaryKey: {
            address: account,
          },
          dbVersion: 1,
          propertyChanges: [{
            name: 'address',
            current: account,
          },
          {
            name: 'username',
            current: username,
          },
          {
            name: 'gny',
            current: 0
          }]
        }];
        return value;
      };

      const history = new Map<number, EntityChanges[]>();
      history.set(0, createEntityChanges('G3igL8sTPQzNquy87bYAR37NoYRNn', 'zero'));
      history.set(1, createEntityChanges('G3y6swmiyCguASMfm46yyUrKWv17w', 'one'));
      history.set(2, createEntityChanges('G3yepz3vN85RcbGa9WwyvWG4YseBy', 'two'));
      history.set(3, createEntityChanges('G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr', 'three'));
      history.set(4, createEntityChanges('Gwwsn2BHCTPswfPkv4bQAPzgs8Gr', 'four'));
      history.set(5, createEntityChanges('G4WuRoNbDfPKgBPDB3nUqQdAs91Rd', 'five'));

      return Promise.resolve(history);
    };

    const mockOnLoadHistory = jest.fn().mockImplementation(onLoadHistory);
    const customSut = new BasicEntityTracker(lruEntityCache, schemas, MAXVERSIONHOLD, logger, mockOnLoadHistory);
    const LOAD_UP_TO_HEIGHT = 5;
    await customSut.initVersion(LOAD_UP_TO_HEIGHT);

    expect(mockOnLoadHistory).toBeCalledTimes(1);

    expect(customSut.getHistoryByVersion(0).length).toEqual(1);
    expect(customSut.getHistoryByVersion(1).length).toEqual(1);
    expect(customSut.getHistoryByVersion(2).length).toEqual(1);
    expect(customSut.getHistoryByVersion(3).length).toEqual(1);
    expect(customSut.getHistoryByVersion(4).length).toEqual(1);
    expect(customSut.getHistoryByVersion(5).length).toEqual(1);

    done();
  });
  it('initVersion(height) does not load if other block was already set', async (done) => {
    const lruEntityCache = new LRUEntityCache(schemas);
    const MAXVERSIONHOLD = 10;

    const logger = LogManager.getLogger('BasicEntityTracker');
    const onLoadHistory = async (from: number, till: number) => {
      const history = new Map<number, EntityChanges[]>();
      return Promise.resolve(history);
    };

    const mockOnLoadHistory = jest.fn().mockImplementation(onLoadHistory);
    const customSut = new BasicEntityTracker(lruEntityCache, schemas, MAXVERSIONHOLD, logger, mockOnLoadHistory);

    // first accept random block height
    customSut.acceptChanges(0);

    // then try to load blocks up to block 5
    const LOAD_UP_TO_HEIGHT = 5;
    customSut.initVersion(LOAD_UP_TO_HEIGHT);
    expect(mockOnLoadHistory).toBeCalledTimes(0);
    done();
  });
  it.skip('getConfirmedChanges', (done) => {
    done();
  });
  it('trackNew("Account")', (done) => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');
    sut.trackNew(accountModelSchema, data);

    expect(sut.getConfirmedChanges().length).toEqual(1);
    done();
  });
  it('trackNew() throws if called twice', (done) => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');

    sut.trackNew(accountModelSchema, data); // once
    expect(() => sut.trackNew(accountModelSchema, data)).toThrow(); // twice
    done();
  });
  it('trackNew() returns entity with set default values', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'xpgeng',
      gny: 0,
    };

    const accountModelSchema = schemas.get('Account');

    const expected = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'xpgeng',
      gny: 0,
      isDelegate: 0,
      isLocked: 0,
      lockAmount: 0,
      lockHeight: 0,
      _version_: 1,
    };

    const result = sut.trackNew(accountModelSchema, data);
    expect(result).toEqual(expected);
    done();
  });
  it('changes after trackNew("Account")', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: 0,
      publicKey: '06080f836e63cfb10516153b97f27a18177637d9b40665b2f1f08b41ad08946a',
      secondPublicKey: null,
      isDelegate: 0,
      isLocked: 0,
      lockHeight: 0,
      lockAmount: 0,
    };
    const accountModelSchema = schemas.get('Account');

    sut.trackNew(accountModelSchema, data);

    const expected: EntityChanges = {
      type: 1,
      model: 'Account',
      primaryKey: {
        address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY'
      },
      dbVersion: 1,
      propertyChanges: [
        {
          name: 'address',
          current: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY'
        },
        {
          name: 'username',
          current: 'liangpeili'
        },
        {
          name: 'gny',
          current: 0
        },
        {
          name: 'publicKey',
          current: '06080f836e63cfb10516153b97f27a18177637d9b40665b2f1f08b41ad08946a'
        },
        {
          name: 'secondPublicKey',
          current: null
        },
        {
          name: 'isDelegate',
          current: 0
        },
        {
          name: 'isLocked',
          current: 0
        },
        {
          name: 'lockHeight',
          current: 0
        },
        {
          name: 'lockAmount',
          current: 0
        }
      ]
    };
    expect(sut.getConfirmedChanges().length).toEqual(1);
    expect(sut.getConfirmedChanges()[0]).toEqual(expected);
    done();
  });

  // why does the _version_ property doesn't get tracked??
  it('trackModify()', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: 0,
      publicKey: '06080f836e63cfb10516153b97f27a18177637d9b40665b2f1f08b41ad08946a',
      secondPublicKey: null,
      isDelegate: 0,
      isLocked: 0,
      lockHeight: 0,
      lockAmount: 0,
    };
    const accountModelSchema = schemas.get('Account');

    const returnedNew = sut.trackNew(accountModelSchema, data);

    const changes = {
      gny: 2000000,
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
          current: 2000000,
          name: 'gny',
          original: 0,
        },
        {
          current: 2,
          name: '_version_',
          original: 1,
        }
      ],
      type: 2,
    };

    expect(sut.getConfirmedChanges().length).toEqual(2);
    expect(sut.getConfirmedChanges()[1]).toEqual(expected);
    done();
  });
  it('trackDelete() without _version_', (done) => {
    const data = {
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
        }
      ],
      type: 3,
    };

    expect(sut.getConfirmedChanges().length).toEqual(1);
    expect(sut.getConfirmedChanges()[0]).toEqual(expected);
    done();
  });
  it('trackDelete() with _version_', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      _version_: 3,
    };

    const accountSchema = schemas.get('Account');
    sut.trackDelete(accountSchema, data);

    const expected = {
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
  it('trackDelete() returns undefined', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };

    const accountSchema = schemas.get('Account');
    const returnedData = sut.trackDelete(accountSchema, data);

    expect(returnedData).toBeUndefined();
    done();
  });
  it('trackDelete() removes entity from cache', (done) => {
    const data = {
      address: 'G3HJjCkEV8u6fsK7juspdz5UDstrx',
      username: 'liangpeili',
      gny: 0,
    };
    const key = {
      address: data.address,
    };

    const accountSchema = schemas.get('Account');

    const entityIsNowTracked = sut.trackNew(accountSchema, data);
    expect(sut.getTrackingEntity(accountSchema, key).address).toEqual(data.address); // first check

    sut.trackDelete(accountSchema, entityIsNowTracked);
    expect(sut.getTrackingEntity(accountSchema, key)).toBeUndefined(); // second check
    done();
  });
  it('trackPersistent() tracks no changes', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: 0,
      _version_: 2,
    };

    const accountSchema = schemas.get('Account');
    sut.trackPersistent(accountSchema, data);

    expect(sut.getConfirmedChanges().length).toEqual(0);
    done();
  });
  it('trackPersistent() returns same data but not same reference', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: 0,
      _version_: 2,
    };

    const accountSchema = schemas.get('Account');
    const returnedValue = sut.trackPersistent(accountSchema, data);

    expect(returnedValue).toEqual(data);
    expect(returnedValue).not.toBe(data);
    done();
  });
  it('trackPersistent() throws if called twice', (done) => {
    const data = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
      username: 'liangpeili',
      gny: 0,
      _version_: 2,
    };

    const accountSchema = schemas.get('Account');
    sut.trackPersistent(accountSchema, data);
    expect(() => sut.trackPersistent(accountSchema, data)).toThrow();

    done();
  });
  it('historyVersions - is min: -1, max: -1 after initialization', (done) => {
    expect(sut.historyVersion).toEqual({
      min: -1,
      max: -1,
    });
    done();
  });
  it.skip('', (done) => {
    sut.beginConfirm();
    sut.confirm();

    // sut.beginConfirm()
    // sut.confirm();

    // sut.beginConfirm();
    // sut.cancelConfirm();

    done();
  });
  it('acceptChanges(10) should set history for block height 10', (done) => {
    const data = {
      address: 'G2S8FueDjrk3jN7pkeui7VmrA8eMU',
      username: 'a1300',
      gny: 0,
    };
    const accountSchema = schemas.get('Account');
    sut.trackNew(accountSchema, data);

    const resultBefore = sut.getHistoryByVersion(10, false);
    expect(resultBefore).toBeUndefined();

    sut.acceptChanges(10);

    const result = sut.getHistoryByVersion(10, false);
    expect(result).toBeTruthy();
    expect(result.length).toEqual(1);
    expect(result[0].primaryKey).toEqual({
      address: 'G2S8FueDjrk3jN7pkeui7VmrA8eMU',
    });

    done();
  });
  it.skip('getConfirmedChanges', (done) => {
    done();
  });
  it.skip('getChangesUntil', (done) => {
    done();
  });
  it('populate unconfirmedChanges during isConfirming phase', (done) => {
    expect(sut.isConfirming).toEqual(false);
    sut.beginConfirm();
    expect(sut.isConfirming).toEqual(true);

    const data = {
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
});
