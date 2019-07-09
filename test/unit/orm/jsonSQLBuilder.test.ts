import { JsonSqlBuilder } from '../../../packages/database-postgres/src/jsonSQLBuilder';
import {
  ModelSchema,
  MetaSchema,
} from '../../../packages/database-postgres/src/modelSchema';
import { generateAddress } from '../../../src/utils/address';
import { randomBytes } from 'crypto';
import { BigNumber } from 'bignumber.js';

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
        isUnique: false, // primary key
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

    const testMetaSchema = getMetaSchemaWithBigNumberPrimaryKey();
    const testModelSchema = new ModelSchema(testMetaSchema);
    modelSchemas.set('Test', testModelSchema);

    sut = new JsonSqlBuilder();
    schemas = modelSchemas;
  });

  afterEach(() => {
    sut = undefined;
  });

  it('buildInsert', done => {
    const data = createAccount('liangpeili');
    const address = data.address;
    const publicKey = data.publicKey;
    const accountModelSchema = schemas.get('Account');

    const result = sut.buildInsert(accountModelSchema, data);

    const expected = `insert into "account" ("address", "username", "gny", "publicKey", "secondPublicKey", "isDelegate", "isLocked", "lockHeight", "lockAmount") values (\'${address}\', \'liangpeili\', 0, \'${publicKey}\', null, 0, 0, null, null);`;

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expected);

    done();
  });

  it('buildDelete', done => {
    const primaryKey = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };
    const accountModelSchema = schemas.get('Account');
    const result = sut.buildDelete(accountModelSchema, primaryKey);

    const expected = `delete from "account" where "address" = \'${
      primaryKey.address
    }\';`;

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expected);

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

    const expected = `update "account" set "address" = \'${
      data.address
    }\', "username" = \'liangpeili\', "gny" = 0, "publicKey" = \'${
      data.publicKey
    }\', "secondPublicKey" = null, "isDelegate" = 0, "isLocked" = 0, "lockHeight" = null, "lockAmount" = null where "address" = \'${
      primaryKey.address
    }\' and "_version_" = 1;`;

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expected);

    done();
  });

  it.skip('buildUpdate with BigNumber property', done => {
    const testModelSchema = schemas.get('Test');
    const primaryKey = {
      height: new BigNumber(10),
    };
    const data = {
      height: new BigNumber(11),
      transactionCount: 20,
    };
    const version = 1;

    const result = sut.buildUpdate(testModelSchema, primaryKey, data, version);

    expect(result).toEqual('');

    done();
  });

  it('buildSelect', done => {
    const field = ['username', 'address'];
    const accountModelSchema = schemas.get('Account');
    const where = { username: 'liangpeili' };
    const result = sut.buildSelect(accountModelSchema, field, where);

    const expected = `select "username", "address" from "account" where "username" = \'${
      where.username
    }\';`;

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expected);

    done();
  });

  it.only('buildSelect with BigNumber property', done => {
    const field = ['height', 'transactionCount'];
    const testModelSchema = schemas.get('Test');
    const where = {
      height: new BigNumber(60),
    };
    const result = sut.buildSelect(testModelSchema, field, where);

    const expected =
      'select "height", "transactionCount" from "test" where "height" = \'60\';';

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expected);

    done();
  });
});
