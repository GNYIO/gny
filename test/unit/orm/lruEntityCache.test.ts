import { LRUEntityCache } from '../../../packages/database-postgres/src/lruEntityCache';
import { ModelSchema, MetaSchema } from '../../../packages/database-postgres/src/modelSchema';
import { LogManager } from '../../../packages/database-postgres/src/logger';
import { ILogger } from '../../../src/interfaces';
import { Delegate } from '../../../packages/database-postgres/entity/Delegate';

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

describe('orm - LRUEntityCache', () => {
  let sut: LRUEntityCache;
  beforeEach(() => {
    const delegateMeta = getDelegateMetaSchema();
    const delegateSchema = new ModelSchema(delegateMeta);

    const schemas = new Map<string, ModelSchema>();
    schemas.set('Delegate', delegateSchema);

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
    const delegate = {
      address: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5',
      username: 'liangpeili',
      tid: 'c680c100cf810c9cf9551378d8eee733f620441cf936eb6f68986be8df291585',
      publicKey: '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9',
      votes: 0,
      producedBlocks: 0,
      missedBlocks: 0,
      fees: 0,
      rewards: 0,
    };
    sut.put('Delegate', { address: 'G3VU8VKndrpzDVbKzNTExoBrDAnw5' }, delegate);

    expect(sut.existsModel('Delegate')).toEqual(true);
    done();
  });

  it.skip('modelSchema x exists -> existsModel() should return true', (done) => {
    done();
  });
});