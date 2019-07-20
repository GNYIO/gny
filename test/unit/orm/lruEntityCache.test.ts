import {
  LRUEntityCache,
  PropertyValue,
} from '../../../packages/database-postgres/src/lruEntityCache';
import {
  ModelSchema,
  MetaSchema,
} from '../../../packages/database-postgres/src/modelSchema';
import { LogManager } from '../../../packages/database-postgres/src/logger';
import { ILogger, IDelegate, IAccount } from '../../../src/interfaces';
import { generateAddress } from '../../../src/utils/address';
import { randomBytes } from 'crypto';

function getDelegateMetaSchema() {
  const delegateMetaSchema: MetaSchema = {
    memory: true,
    name: 'Delegate',
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
            propertyName: 'tid',
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
      {
        isUnique: true,
        columns: [
          {
            propertyName: 'publicKey',
          },
        ],
      },
    ],
    columns: [
      {
        name: 'address',
      },
      {
        name: 'tid',
      },
      {
        name: 'username',
      },
      {
        name: 'publicKey',
      },
      {
        name: 'votes',
      },
      {
        name: 'producedBlocks',
      },
      {
        name: 'missedBlocks',
      },
      {
        name: 'fees',
      },
      {
        name: 'rewards',
      },
    ],
  };
  return delegateMetaSchema;
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

function createHexString(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createDelegate(username: string) {
  const publicKey = createHexString(32);
  const address = generateAddress(publicKey);
  const delegate: IDelegate = {
    address,
    username,
    tid: createHexString(32),
    publicKey: createHexString(32),
    votes: String(0),
    producedBlocks: String(0),
    missedBlocks: String(0),
    fees: String(0),
    rewards: String(0),
  };
  return delegate;
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

describe('orm - LRUEntityCache', () => {
  let sut: LRUEntityCache;
  beforeEach(() => {
    const delegateMeta = getDelegateMetaSchema();
    const delegateSchema = new ModelSchema(delegateMeta);

    const accountMeta = getAccountMetaSchema();
    const accountSchema = new ModelSchema(accountMeta);

    const schemas = new Map<string, ModelSchema>();
    schemas.set('Delegate', delegateSchema);
    schemas.set('Account', accountSchema);

    const logger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };
    LogManager.setLogger(logger);

    sut = new LRUEntityCache(schemas);
  });
  afterEach(() => {
    sut = undefined;
  });

  it('no model x -> existsModel() should return false', done => {
    expect(sut.existsModel('Delegate')).toEqual(false);
    done();
  });

  it('cache Delegate obj - existsModel("Delegate") -> returns true', done => {
    const delegate = createDelegate('liangpeili');
    sut.put('Delegate', { address: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5' }, delegate);

    expect(sut.existsModel('Delegate')).toEqual(true);
    done();
  });

  it('put(Round) without Round ModelSchema throws error', done => {
    const key = { address: generateAddress(createHexString(32)) };
    const data = { test: 3 };
    expect(() => sut.put('Round', key, data)).toThrow();
    done();
  });

  it('simple put({ address: "G2S8FueDjrk3jN7pkeui7VmrA8eMU" })', done => {
    const delegate = createDelegate('liangpeili');
    const key: Partial<IDelegate> = {
      address: delegate.address,
    };

    sut.put('Delegate', key, delegate);

    expect(sut.get('Delegate', key)).toEqual(delegate);
    done();
  });

  it('direct put("G2S8FueDjrk3jN7pkeui7VmrA8eMU")', done => {
    const delegate = createDelegate('liangpeili');
    const specialkey = delegate.address;

    sut.put('Delegate', specialkey, delegate);

    expect(sut.get('Delegate', specialkey)).toEqual(delegate);
    done();
  });

  it('simple key ({ key: "key" }) can not access direct key ("key")', done => {
    const delegate = createDelegate('xpgeng');
    const specialkey = delegate.address;

    sut.put('Delegate', specialkey, delegate);

    const simpleKey = {
      address: delegate.address,
    };

    expect(sut.get('Delegate', simpleKey)).toBeUndefined();
    done();
  });

  it('direct key ("key") can not access simple key ({ key: "key" })', done => {
    const delegate = createDelegate('xpgeng');
    const simplekey: Partial<IDelegate> = {
      address: delegate.address,
    };

    sut.put('Delegate', simplekey, delegate);

    const directKey = delegate.address;

    expect(sut.get('Delegate', directKey)).toBeUndefined();
    done();
  });

  it('simple get()', done => {
    const data = createDelegate('a1300');
    const key: Partial<IDelegate> = {
      address: data.address,
    };

    sut.put('Delegate', key, data);

    expect(sut.get('Delegate', key)).toEqual(data);
    done();
  });

  it('simple exist()', done => {
    const data = createDelegate('xpgeng');
    const key: Partial<IDelegate> = {
      address: data.address,
    };

    sut.put('Delegate', key, data);

    expect(sut.exists('Delegate', key)).toEqual(true);
    done();
  });

  it('after clear() should exists return false', done => {
    const data = createDelegate('a1300');
    const key: Partial<IDelegate> = {
      address: data.address,
    };

    sut.put('Delegate', key, data);

    expect(sut.exists('Delegate', key)).toEqual(true);
    sut.clear();
    expect(sut.exists('Delegate', key)).toEqual(false);
    done();
  });

  it('WARNING put() updating the data updates also the cached reference', done => {
    const data = createDelegate('liangpeili');
    data.producedBlocks = String(5);
    const key = {
      address: data.address,
    };
    sut.put('Delegate', key, data);

    data.producedBlocks = String(10); // update reference

    expect(sut.get('Delegate', key).producedBlocks).toEqual(String(10));

    done();
  });

  it('put(Delegate) -> updateCached() -> get(key) -> should return updated Delegate obj', done => {
    const data = createDelegate('liangpeili');
    data.producedBlocks = String(0);

    const key: Partial<IDelegate> = {
      address: data.address,
    };
    sut.put('Delegate', key, data);

    const changes: PropertyValue[] = [
      {
        name: 'producedBlocks',
        value: String(10),
      },
    ];

    sut.refreshCached('Delegate', key, changes);
    expect(sut.get('Delegate', key).producedBlocks).toEqual(String(10)); // check if cache was updated

    done();
  });

  it('clear() should delete all ModelCaches', done => {
    const delegateData = createDelegate('a1300');
    const delegateKey: Partial<IDelegate> = {
      address: delegateData.address,
    };

    const accountData = createAccount('asdf');
    const accountKey: Partial<IAccount> = {
      address: accountData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);
    sut.put('Account', accountKey, accountData);

    expect(sut.existsModel('Delegate')).toEqual(true);
    expect(sut.existsModel('Account')).toEqual(true);

    sut.clear();

    expect(sut.existsModel('Delegate')).toEqual(false);
    expect(sut.existsModel('Account')).toEqual(false);
    done();
  });

  it('clear("Delegate") should only delete Delegate-ModelCache', done => {
    const delegateData = createDelegate('a1300');
    const delegateKey: Partial<IDelegate> = {
      address: delegateData.address,
    };

    const accountData = createAccount('asdf');
    const accountKey: Partial<IAccount> = {
      address: accountData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);
    sut.put('Account', accountKey, accountData);

    expect(sut.existsModel('Delegate')).toEqual(true);
    expect(sut.existsModel('Account')).toEqual(true);

    sut.clear('Delegate'); // clear only Delegate, not Account

    expect(sut.existsModel('Delegate')).toEqual(false);
    expect(sut.existsModel('Account')).toEqual(true);

    done();
  });

  it('simple getUnique()', done => {
    const delegateData = createDelegate('a1300');
    const delegateKey: Partial<IDelegate> = {
      address: delegateData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);

    const uniqueConstraintKey = {
      username: delegateData.username,
    };

    expect(sut.getUnique('Delegate', 'username', uniqueConstraintKey)).toEqual(
      delegateData
    );
    done();
  });

  it('getUnique() should return the data for all unique indices', done => {
    const delegateData = createDelegate('a1300');
    const delegateKey: Partial<IDelegate> = {
      address: delegateData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);

    const addressUnique: Partial<IDelegate> = {
      address: delegateData.address,
    };
    const tidUnique: Partial<IDelegate> = {
      tid: delegateData.tid,
    };
    const usernameUnique: Partial<IDelegate> = {
      username: delegateData.username,
    };
    const publicKeyUnique: Partial<IDelegate> = {
      publicKey: delegateData.publicKey,
    };

    expect(sut.getUnique('Delegate', 'address', addressUnique)).toEqual(
      delegateData
    );
    expect(sut.getUnique('Delegate', 'tid', tidUnique)).toEqual(delegateData);
    expect(sut.getUnique('Delegate', 'username', usernameUnique)).toEqual(
      delegateData
    );
    expect(sut.getUnique('Delegate', 'publicKey', publicKeyUnique)).toEqual(
      delegateData
    );

    done();
  });

  it('refreshCached() - are all uniquedColumn caches also updated?', done => {
    const delegateData = createDelegate('liangpeili');
    const delegateKey: Partial<IDelegate> = {
      address: delegateData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);

    const addressUnique: Partial<IDelegate> = {
      address: delegateData.address,
    };
    const tidUnique: Partial<IDelegate> = {
      tid: delegateData.tid,
    };
    const usernameUnique: Partial<IDelegate> = {
      username: delegateData.username,
    };
    const publicKeyUnique: Partial<IDelegate> = {
      publicKey: delegateData.publicKey,
    };

    expect(sut.getUnique('Delegate', 'address', addressUnique)).toEqual(
      delegateData
    );
    expect(sut.getUnique('Delegate', 'tid', tidUnique)).toEqual(delegateData);
    expect(sut.getUnique('Delegate', 'username', usernameUnique)).toEqual(
      delegateData
    );
    expect(sut.getUnique('Delegate', 'publicKey', publicKeyUnique)).toEqual(
      delegateData
    );

    const updates: PropertyValue[] = [
      {
        name: 'votes',
        value: String(100),
      },
    ];

    // update
    sut.refreshCached('Delegate', delegateKey, updates);

    expect(sut.getUnique('Delegate', 'address', addressUnique).votes).toEqual(
      String(100)
    );
    expect(sut.getUnique('Delegate', 'tid', tidUnique).votes).toEqual(
      String(100)
    );
    expect(sut.getUnique('Delegate', 'username', usernameUnique).votes).toEqual(
      String(100)
    );
    expect(
      sut.getUnique('Delegate', 'publicKey', publicKeyUnique).votes
    ).toEqual(String(100));

    done();
  });

  it('getUnique() throws if Model Schema not found', done => {
    expect(() =>
      sut.getUnique('Issuer', 'tid', {
        tid: '0747e1ba3d28a15c0300e83553a44092db',
      })
    ).toThrow();
    done();
  });

  it('getUnique() throws if model found, but unique column not found', done => {
    expect(() =>
      sut.getUnique('Delegate', 'missedBlocks', { missedBlocks: String(2) })
    ).toThrow();
    done();
  });

  it('getAll()', done => {
    const oneData = createDelegate('xpgeng');
    const secondData = createDelegate('a1300');

    const oneKey: Partial<IDelegate> = {
      address: oneData.address,
    };
    const secondKey: Partial<IDelegate> = {
      address: secondData.address,
    };

    sut.put('Delegate', oneKey, oneData);
    sut.put('Delegate', secondKey, secondData);

    const result = sut.getAll('Delegate');
    expect(result).toEqual([secondData, oneData]);
    done();
  });

  it('prop models', done => {
    const delegateMeta = getDelegateMetaSchema();
    const delegateSchema = new ModelSchema(delegateMeta);

    const accountMeta = getAccountMetaSchema();
    const accountSchema = new ModelSchema(accountMeta);

    const expected = [delegateSchema, accountSchema];

    expect(sut.models).toEqual(expected);
    done();
  });
});
