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
  it.skip('initVersion(height) loads changes from old blocks', (done) => {
    done();
  });
  it.skip('getConfirmedChanges', (done) => {
    done();
  });
  it('trackNew("Account")', (done) => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');
    sut.trackNew(accountModelSchema, data);
    done();
  });
  it.skip('trackNew() throws if called twice', (done) => {
    done();
  });
  it.skip('trackDelete()', (done) => {
    // sut.trackDelete
    done();
  });
  it.skip('trackModify()', (done) => {
    done();
  });
  it.skip('trackPersistent()', (done) => {
    done();
  });
  it.skip('trackPersistent() throws if called twice', (done) => {
    done();
  });
  it.skip('historyVersions - is min: -1, max: -1 after initialization', (done) => {
    // sut.historyVersion()
    done();
  });
  it.skip('', (done) => {
    // sut.beginConfirm()
    // sut.confirm();

    // sut.beginConfirm();
    // sut.cancelConfirm();

    done();
  });
  it.skip('acceptChanges(18) should set history for block height 10', (done) => {
    // check before after if changes where persisted with the help of getHistoryByVersion()
    done();
  });
  it.skip('getConfirmedChanges', (done) => {
    done();
  });
});
