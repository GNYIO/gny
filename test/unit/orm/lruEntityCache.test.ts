import { LRUEntityCache, PropertyValue } from '../../../packages/database-postgres/src/lruEntityCache';
import { ModelSchema, MetaSchema } from '../../../packages/database-postgres/src/modelSchema';
import { LogManager } from '../../../packages/database-postgres/src/logger';
import { ILogger } from '../../../src/interfaces';
import { Account } from '../../../packages/database-postgres/entity/Account';
import { generateAddress } from '../../../src/utils/address';
import { randomBytes } from 'crypto';

function getDelegateMetaSchema() {
  const delegateMetaSchema: MetaSchema = {
    memory: true,
    name: 'Delegate',
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
        propertyName: 'tid',
      }]
    }, {
      isUnique: true,
      columns: [{
        propertyName: 'username',
      }]
    }, {
      isUnique: true,
      columns: [{
        propertyName: 'publicKey',
      }]
    }],
    propertiesMap: {
      address: 'address',
      tid: 'tid',
      username: 'username',
      publicKey: 'publicKey',
      votes: 'votes',
      producedBlocks: 'producedBlocks',
      missedBlocks: 'missedBlocks',
      fees: 'fees',
      rewards: 'rewards',
      _version_: '_version_',
    },
  };
  return delegateMetaSchema;
}

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
    propertiesMap: {
      address: 'address',
      username: 'username',
      gny: 'gny',
      publicKey: 'publicKey',
      secondPublicKey: 'secondPublicKey',
      isDelegate: 'isDelegate',
      isLocked: 'isLocked',
      lockHeight: 'lockHeight',
      lockAmount: 'lockAmount',
    }
  };
  return accountMetaSchema;
}

function createHexString(length: number) {
  return Buffer.from(randomBytes(length)).toString('hex');
}

function createDelegate(username: string) {
  const publicKey = createHexString(32);
  const address = generateAddress(publicKey);
  const delegate = {
    address,
    username,
    tid: createHexString(32),
    publicKey: createHexString(32),
    votes: 0,
    producedBlocks: 0,
    missedBlocks: 0,
    fees: 0,
    rewards: 0,
  };
  return delegate;
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
      log: (x) => x,
      trace: (x) => x,
      debug: (x) => x,
      info: (x) => x,
      warn: (x) => x,
      error: (x) => x,
      fatal: (x) => x,
    };
    LogManager.setLogger(logger);

    sut = new LRUEntityCache(schemas);
  });
  afterEach(() => {
    sut = undefined;
  });


  it('no model x -> existsModel() should return false', (done) => {
    expect(sut.existsModel('Delegate')).toEqual(false);
    done();
  });

  it('cache Delegate obj - existsModel("Delegate") -> returns true', (done) => {
    const delegate = createDelegate('liangpeili');
    sut.put('Delegate', { address: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5' }, delegate);

    expect(sut.existsModel('Delegate')).toEqual(true);
    done();
  });

  it('put(Account) without Round ModelSchema throws error', (done) => {
    const key = { address: generateAddress(createHexString(32)) };
    const data = { test: 3 };
    expect(() => sut.put('Round', key, data)).toThrow();
    done();
  });

  it.skip('put({ address: "dfefjijief" })', (done) => {
    done();
  });
  it.skip('put("dfefjijief")', (done) => {
  });

  it('simple get()', (done) => {
    const data = createDelegate('a1300');
    const key = {
      address: data.address,
    };

    sut.put('Delegate', key, data);

    expect(sut.get('Delegate', key)).toEqual(data);
    done();
  });

  it('simple exist()', (done) => {
    const data = createDelegate('xpgeng');
    const key = {
      address: data.address,
    };

    sut.put('Delegate', key, data);

    expect(sut.exists('Delegate', key)).toEqual(true);
    done();
  });

  it('WARNING put() updating the data updates also the cached reference', (done) => {
    const data = createDelegate('liangpeili');
    data.producedBlocks = 5;
    const key = {
      address: data.address,
    };
    sut.put('Delegate', key, data);

    data.producedBlocks = 10; // update reference

    expect(sut.get('Delegate', key).producedBlocks).toEqual(10);

    done();
  });

  it('put(Delegate) -> updateCached() -> get(key) -> should return updated Delegate obj', (done) => {
    const data = createDelegate('liangpeili');
    data.producedBlocks = 0;

    const key = {
      address: data.address,
    };
    sut.put('Delegate', key, data);

    const changes: PropertyValue[] = [{
      name: 'producedBlocks',
      value: 10,
    }];

    sut.refreshCached('Delegate', key, changes);
    expect(sut.get('Delegate', key).producedBlocks).toEqual(10); // check if cache was updated

    done();
  });

  it('clear() should delete all ModelCaches', (done) => {
    const delegateData = createDelegate('a1300');
    const delegateKey = {
      address: delegateData.address,
    };

    const accountData = createAccount('asdf');
    const accountKey = {
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

  it('clear("Delegate") should only delete Delegate-ModelCache', (done) => {
    const delegateData = createDelegate('a1300');
    const delegateKey = {
      address: delegateData.address,
    };

    const accountData = createAccount('asdf');
    const accountKey = {
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

  it('simple getUnique()', (done) => {
    const delegateData = createDelegate('a1300');
    const delegateKey = {
      address: delegateData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);

    const uniqueConstraintKey = {
      username: delegateData.username,
    };

    expect(sut.getUnique('Delegate', 'username', uniqueConstraintKey)).toEqual(delegateData);
    done();
  });

  it('getUnique() should return the data for all unique indices', (done) => {
    const delegateData = createDelegate('a1300');
    const delegateKey = {
      address: delegateData.address,
    };

    sut.put('Delegate', delegateKey, delegateData);

    const addressUnique = {
      address: delegateData.address,
    };
    const tidUnique = {
      tid: delegateData.tid,
    };
    const usernameUnique = {
      username: delegateData.username,
    };
    const publicKeyUnique = {
      publicKey: delegateData.publicKey,
    };

    expect(sut.getUnique('Delegate', 'address', addressUnique)).toEqual(delegateData);
    expect(sut.getUnique('Delegate', 'tid', tidUnique)).toEqual(delegateData);
    expect(sut.getUnique('Delegate', 'username', usernameUnique)).toEqual(delegateData);
    expect(sut.getUnique('Delegate', 'publicKey', publicKeyUnique)).toEqual(delegateData);

    done();
  });

  it.skip('refreshCache - are all uniquedColumn caches also updated???', (done) => {
    done();
  });

  it.skip('getUnique() throws if model not found', (done) => {
    done();
  });
  it.skip('getUnique() throws if model found, but unique column not found', (done) => {
    done();
  });

  it.skip('getAll()', (done) => {
    done();
  });
});