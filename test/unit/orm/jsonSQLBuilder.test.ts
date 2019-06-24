import { JsonSqlBuilder } from '../../../packages/database-postgres/src/jsonSQLBuilder';
import {
  ModelSchema,
  MetaSchema,
} from '../../../packages/database-postgres/src/modelSchema';
import { generateAddress } from '../../../src/utils/address';
import { randomBytes } from 'crypto';

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
        default: 0,
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
        default: 0,
      },
      {
        name: 'lockAmount',
        default: 0,
      },
    ],
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

describe('orm jsonSQLBuilder', () => {
  let sut: JsonSqlBuilder;
  let schemas: Map<string, ModelSchema>;

  beforeEach(() => {
    const modelSchemas = new Map<string, ModelSchema>();

    const accountMetaSchema = getAccountMetaSchema();
    const accountModelSchema = new ModelSchema(accountMetaSchema);
    modelSchemas.set('Account', accountModelSchema);

    sut = new JsonSqlBuilder();
    schemas = modelSchemas;
  });

  afterEach(() => {
    sut = undefined;
  });

  it('buildInsert', done => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');

    const result = sut.buildInsert(accountModelSchema, data);

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query');

    done();
  });

  it('buildDelete', done => {
    const primaryKey = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };
    const accountModelSchema = schemas.get('Account');
    const result = sut.buildDelete(accountModelSchema, primaryKey);

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query');

    done();
  });

  it('buildUpdate', done => {
    const data = createAccount('liangpeili');
    const accountModelSchema = schemas.get('Account');
    const primaryKey = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };
    const version = 1;
    const result = sut.buildUpdate(
      accountModelSchema,
      primaryKey,
      data,
      version
    );

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query');

    done();
  });

  it('buildSelect', done => {
    const field = ['username', 'address'];
    const accountModelSchema = schemas.get('Account');
    const where = { username: 'liangpeili' };
    const result = sut.buildSelect(accountModelSchema, field, where);

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query');

    done();
  });
});
