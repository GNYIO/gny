import { JsonSqlBuilder } from '@gnyio/database-postgres';
import { ModelSchema, MetaSchema } from '@gnyio/database-postgres';
import { generateAddress } from '@gnyio/utils';
import { randomBytes } from 'crypto';
import { IAccount } from '@gnyio/interfaces';

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

  it('buildInsert', () => {
    expect.assertions(3);

    const data = createAccount('liangpeili');
    const address = data.address;
    const publicKey = data.publicKey;
    const accountModelSchema = schemas.get('Account');

    const result = sut.buildInsert(accountModelSchema, data);

    // todo
    // this is odd that for "null" and 0 is not used a $x parameter
    const expectedString = `insert into "account" ("address", "username", "gny", "publicKey", "secondPublicKey", "isDelegate", "isLocked", "lockHeight", "lockAmount") values ($1, $2, $3, $4, null, 0, 0, null, null);`;

    const expectedValues = [address, 'liangpeili', String(0), publicKey];

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expectedString);
    expect(result).toHaveProperty('values', expectedValues);
  });

  it('buildDelete', () => {
    expect.assertions(3);

    const primaryKey = {
      address: 'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    };
    const accountModelSchema = schemas.get('Account');
    const result = sut.buildDelete(accountModelSchema, primaryKey);

    const expectedString = `delete from "account" where "address" = $1;`;

    const expectedValues = ['G2kDbA9SWh9k1vmf7XFTADcCHHsNY'];

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expectedString);
    expect(result).toHaveProperty('values', expectedValues);
  });

  it('buildUpdate', () => {
    expect.assertions(3);

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

    const expectedString = `update "account" set "address" = $1, "username" = $2, "gny" = $3, "publicKey" = $4, "secondPublicKey" = null, "isDelegate" = 0, "isLocked" = 0, "lockHeight" = null, "lockAmount" = null where "address" = $5 and "_version_" = 1;`;

    const expectedValues = [
      data.address,
      'liangpeili',
      '0',
      data.publicKey,
      'G2kDbA9SWh9k1vmf7XFTADcCHHsNY',
    ];

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('query', expectedString);
    expect(result).toHaveProperty('values', expectedValues);
  });

  describe('buildSelect', () => {
    it('buildSelect - query by unique key', () => {
      expect.assertions(3);

      const field = ['username', 'address'];
      const accountModelSchema = schemas.get('Account');
      const where = { username: 'liangpeili' };
      const result = sut.buildSelect(accountModelSchema, field, where);

      const expectedString = `select "username", "address" from "account" where "username" = $1;`;

      const expectedValues = ['liangpeili'];

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - $in (WHERE IN)', () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {
          address: {
            $in: [
              'G3igL8sTPQzNquy87bYAR37NoYRNn',
              'G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr',
            ],
          },
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account" where "address" in ($1, $2);`;
      const expectedValues = [
        'G3igL8sTPQzNquy87bYAR37NoYRNn',
        'G3HRXhs3tDJLpA4ntLHP2nb5Xwwyr',
      ];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it.skip('buildSelect - query by composite key', () => {});

    it('buildSelect - sort by column ascending (ASC)', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {},
        sort: {
          address: 1,
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account"  order by "address" asc;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - sort by column descending (DESC)', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {},
        sort: {
          address: -1,
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account"  order by "address" desc;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - sort first by column x then by column y', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {},
        sort: {
          gny: -1,
          username: 1,
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account"  order by "gny" desc, "username" asc;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - sort first by column y then by column x', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {},
        sort: {
          username: 1,
          gny: -1,
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account"  order by "username" asc, "gny" desc;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - filter by $gte', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {
          gny: {
            $gte: 3000,
          },
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account" where "gny" >= 3000;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - filter by $lte', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {
          gny: {
            $lte: 3000,
          },
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account" where "gny" <= 3000;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - filter by $gte and $lte', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {
          gny: {
            $gte: 5000,
            $lte: 10000,
          },
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select * from "account" where "gny" >= 5000 and "gny" <= 10000;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - count(*)', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        fields: [
          {
            expression: 'count(*)',
          },
        ],
        condition: {},
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select count(*) from "account";`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - count(*) with $gte and $lte', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        fields: [
          {
            expression: 'count(*)',
          },
        ],
        condition: {
          gny: {
            $gte: 5000,
            $lte: 10000,
          },
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      const expectedString = `select count(*) from "account" where "gny" >= 5000 and "gny" <= 10000;`;
      const expectedValues = [];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });

    it('buildSelect - $or', async () => {
      expect.assertions(2);

      const accountModelSchema = schemas.get('Account');
      const fields = {
        condition: {
          $or: {
            username: 'a1300',
            address: 'G2ntnY6Ph3WVHESwpeFmMGa2BATrr',
          },
        },
      };

      const result = sut.buildSelect(accountModelSchema, fields);

      console.log(result);

      const expectedString = `select * from "account" where "username" = $1 or "address" = $2;`;
      const expectedValues = ['a1300', 'G2ntnY6Ph3WVHESwpeFmMGa2BATrr'];

      expect(result).toHaveProperty('query', expectedString);
      expect(result).toHaveProperty('values', expectedValues);
    });
  });
});
