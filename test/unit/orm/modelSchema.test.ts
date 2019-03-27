import { ModelSchema, MetaSchema } from '../../../packages/database-postgres/src/modelSchema';


describe('orm - ModelSchema', () => {
  let sut: ModelSchema;
  beforeEach(() => {
    const entityMetadata: MetaSchema = {
      memory: false,
      maxCachedCount: 2000,
      name: 'Account',
      indices: [{
        isUnique: false,
        columns: [{
         propertyName: 'address',
        }],
      }, {
        isUnique: true,
        columns: [{
          propertyName: 'username'
        }]
      }],
      columns: [{
        name: 'address',
      }, {
        name: 'username',
      }, {
        name: 'gny',
        default: 0,
      }],
    };
    sut = new ModelSchema(entityMetadata);
  });


  it('hasUniqueProperty("gny") -> false', (done) => {
    const result = sut.hasUniqueProperty('gny');
    expect(result).toEqual(false);
    done();
  });
  it('hasUniqueProperty("username") -> true', (done) => {
    const result = sut.hasUniqueProperty('username');
    expect(result).toEqual(true);
    done();
  });
  it('hasUniqueProperty("username", "wrongColumn") -> true', (done) => {
    const result = sut.hasUniqueProperty('username', 'wrongColumn');
    expect(result).toEqual(true);
    done();
  });
  it('uniquePropertiesSet prop', (done) => {
    const expected = new Set().add('username');
    expect(sut.uniquePropertiesSet).toEqual(expected);
    done();
  });
  it('prop indexes returns normalIndexes', (done) => {
    expect(sut.indexes).toEqual([{
      name: 'address',
      properties: ['address'],
    }]);
    done();
  });
  it('prop uniqueIndexes', (done) => {
    expect(sut.uniqueIndexes).toEqual([{
      name: 'username',
      properties: ['username'],
    }]);
    done();
  });
  it('prop modelName', (done) => {
    expect(sut.modelName).toEqual('Account');
    done();
  });
  it('prop memCached is always value that is passed to constructor (true)', (done) => {
    const metaSchema: MetaSchema = {
      memory: true,
      maxCachedCount: 2000,
      name: 'Delegate',
      indices: [],
      columns: [],
    };
    const customSut = new ModelSchema(metaSchema);

    expect(customSut.memCached).toEqual(true);
    done();
  });
  it('prop memCached is always value that is passed to constructor (false)', (done) => {
    const metaSchema: MetaSchema = {
      memory: false,
      maxCachedCount: 2000,
      name: 'Round',
      indices: [],
      columns: [],
    };
    const customSut = new ModelSchema(metaSchema);

    expect(customSut.memCached).toEqual(false);
    done();
  });
  it('prop maxCached will be set if maxCachedCount is provided and memory=true', (done) => {
    const metaSchema: MetaSchema = {
      memory: false,
      maxCachedCount: 500,
      name: 'Round',
      indices: [],
      columns: [],
    };
    const customSut = new ModelSchema(metaSchema);
    expect(customSut.maxCached).toEqual(500);
    done();
  });
  it('prop maxCached will be "undefined" if maxCachedCount is undefined and memory=true', (done) => {
    const metaSchema: MetaSchema = {
      memory: false,
      maxCachedCount: undefined,
      name: 'Round',
      indices: [],
      columns: [],
    };
    const customSut = new ModelSchema(metaSchema);
    expect(customSut.maxCached).toBeUndefined();
    done();
  });
  it('prop maxCached will POSITIVE_INFINITY if memory=true', (done) => {
    const metaSchema: MetaSchema = {
      memory: true,
      maxCachedCount: 3000, // it does not matter what is provided her
      name: 'Round',
      indices: [],
      columns: [],
    };
    const customSut = new ModelSchema(metaSchema);
    expect(customSut.maxCached).toEqual(Number.POSITIVE_INFINITY);
    done();
  });
  it('isValidProperty() true', (done) => {
    expect(sut.isValidProperty('username')).toEqual(true);
    done();
  });
  it('isValidProperty() false', (done) => {
    expect(sut.isValidProperty('wrong')).toEqual(false);
    done();
  });
  it('prop properties', (done) => {
    expect(sut.properties).toEqual(['address', 'username', 'gny']);
    done();
  });
  it('prop primaryKey', (done) => {
    expect(sut.primaryKey).toEqual('address');
    done();
  });
  it('getNormalizedPrimaryKey(obj)', (done) => {
    const account = {
      address: 'G3igL8sTPQzNquy87bYAR37NoYRNn',
      username: 'liangpeili',
      gny: 2000e8,
      publicKey: 'e28066fe2185e950f2df851772d346af68119c96b882d41b8cd5283a901cff63',
    };
    const expected = {
      address: 'G3igL8sTPQzNquy87bYAR37NoYRNn'
    };
    expect(sut.getNormalizedPrimaryKey(account)).toEqual(expected);
    done();
  });
  it('resolveKey(primary key)', (done) => {
    const data = {
      address: 'G28aWzLNE7AgJG3w285Zno9wLo88c',
    };
    const expected = {
      isPrimaryKey: true,
      key: {
        address: 'G28aWzLNE7AgJG3w285Zno9wLo88c',
      },
      uniqueName: '__PrimaryKey__',
    };
    const result = sut.resolveKey(data);
    expect(result).toEqual(expected);
    done();
  });
  it('resolveKey(unique key)', (done) => {
    const data = {
      username: 'liangpeili',
    };
    const expected = {
      isUniqueKey: true,
      key: {
        username: 'liangpeili',
      },
      uniqueName: 'username',
    };
    const result = sut.resolveKey(data);
    expect(result).toEqual(expected);
    done();
  });
  it('resolveKey(normal prop) returns undefined', (done) => {
    const data = {
      gny: 0,
    };
    const result = sut.resolveKey(data);
    expect(result).toBeUndefined();
    done();
  });
  it('setPrimaryKey() direct key', (done) => {
    const source = {};
    const directKey = 'G3DpbtT5QNF5smWYTyLTzJ8812SRx';
    const result = sut.setPrimaryKey(source, directKey);
    expect(result).toEqual({
      address: 'G3DpbtT5QNF5smWYTyLTzJ8812SRx',
    });
    done();
  });
  it('setPrimaryKey() simple key', (done) => {
    const source = {};
    const simpleKey = { address: 'G3DpbtT5QNF5smWYTyLTzJ8812SRx' };
    const result = sut.setPrimaryKey(source, simpleKey);
    expect(result).toEqual({
      address: 'G3DpbtT5QNF5smWYTyLTzJ8812SRx',
    });
    done();
  });
  it('copyProperties(obj, true) makes deep copy', (done) => {
    const data = {
      address: 'GQ6hcPj74Tgj89KeCkQJGgUcCqLZ',
      gny: 0,
      username: 'liangpeili',
    };
    const result = sut.copyProperties(data);
    expect(result).not.toBe(data); // not same object reference
    expect(result).toEqual(data); // but data is the same
    done();
  });
  it('getPrimaryKey(obj) pass object with primary key', (done) => {
    const data = {
      address: 'GQ6hcPj74Tgj89KeCkQJGgUcCqLZ',
      gny: 0,
      username: 'liangpeili',
    };
    const result = sut.getPrimaryKey(data);
    expect(result).toEqual('GQ6hcPj74Tgj89KeCkQJGgUcCqLZ');
    done();
  });
  it('getPrimaryKey(obj) pass object without primary key', (done) => {
    const data = {
      gny: 0,
      username: 'liangpeili',
    };
    const result = sut.getPrimaryKey(data);
    expect(result).toBeUndefined();
    done();
  });
  it('setDefaultValues() for props that are not set yet', (done) => {
    const data = {
      address: 'G2t7A6cwnAgpGpMnYKf4S4pSGiu2Z',
      username: 'a1300',
    };
    sut.setDefaultValues(data);
    expect(data).toEqual({ // default property for "gny" has been set
      address: 'G2t7A6cwnAgpGpMnYKf4S4pSGiu2Z',
      username: 'a1300',
      gny: 0,
    });
    done();
  });
  it('setDefaultValues() should not set default if value is already provided', (done) => {
    const data = {
      address: 'G2t7A6cwnAgpGpMnYKf4S4pSGiu2Z',
      username: 'a1300',
      gny: 80000000000,
    };
    sut.setDefaultValues(data);
    expect(data).toEqual({ // "gny" column should stay the same
      address: 'G2t7A6cwnAgpGpMnYKf4S4pSGiu2Z',
      username: 'a1300',
      gny: 80000000000,
    });
    done();
  });
  it('prop isCompositeKeys is correct', (done) => {
    const metaSchema: MetaSchema = {
      memory: true,
      name: 'Balance',
      indices: [{
        isUnique: false,
        columns: [{ propertyName: 'address' }],
      }, {
        isUnique: false,
        columns: [{ propertyName: 'currency' }],
      }],
      columns: [{
        name: 'address',
      }, {
        name: 'currency',
      }, {
        name: 'balance',
      }, {
        name: 'flag',
      }],
    };
    const modelSchema = new ModelSchema(metaSchema);
    expect(modelSchema.isCompsiteKey).toEqual(true);
    done();
  });
  it('return correct composite keys', (done) => {
    const metaSchema: MetaSchema = {
      memory: true,
      name: 'Balance',
      indices: [{
        isUnique: false,
        columns: [{ propertyName: 'address' }],
      }, {
        isUnique: false,
        columns: [{ propertyName: 'currency' }],
      }],
      columns: [{
        name: 'address',
      }, {
        name: 'currency',
      }, {
        name: 'balance',
      }, {
        name: 'flag',
      }],
    };
    const modelSchema = new ModelSchema(metaSchema);
    expect(modelSchema.compositeKeys).toEqual(['address', 'currency']);
    done();
  });
  it('isValidPrimaryKey for composite keys returns true', (done) => {
    const metaSchema: MetaSchema = {
      memory: true,
      name: 'Balance',
      indices: [{
        isUnique: false,
        columns: [{ propertyName: 'address' }],
      }, {
        isUnique: false,
        columns: [{ propertyName: 'currency' }],
      }],
      columns: [{
        name: 'address',
      }, {
        name: 'currency',
      }, {
        name: 'balance',
      }, {
        name: 'flag',
      }],
    };
    const modelSchema = new ModelSchema(metaSchema);
    const key = {
      address: 'GuGD9McasETcrw7tEcBfoz9UiYZs',
      currency: 'ABC.ABC',
    };
    expect(modelSchema.isValidPrimaryKey(key)).toEqual(true);
    done();
  });
  it('isValidPrimaryKey for incomplete composite key returns false', (done) => {
    const metaSchema: MetaSchema = {
      memory: true,
      name: 'Balance',
      indices: [{
        isUnique: false,
        columns: [{ propertyName: 'address' }],
      }, {
        isUnique: false,
        columns: [{ propertyName: 'currency' }],
      }],
      columns: [{
        name: 'address',
      }, {
        name: 'currency',
      }, {
        name: 'balance',
      }, {
        name: 'flag',
      }],
    };
    const modelSchema = new ModelSchema(metaSchema);
    const key = {
      currency: 'ABC.ABC',
    };
    expect(modelSchema.isValidPrimaryKey(key)).toEqual(false);
    done();
  });
  it('isValidPrimaryKey for single primary key returns false', (done) => {
    const key = {
      address: 'GuGD9McasETcrw7tEcBfoz9UiYZs',
    };
    expect(sut.isValidPrimaryKey(key)).toEqual(true);
    done();
  });
  it('isValidPrimaryKey for wrong single key returns false', (done) => {
    const key = {
      username: 'a1300',
    };
    expect(sut.isValidPrimaryKey(key)).toEqual(false);
    done();
  });
  it.skip('can not have primaryKeys and composite keys', (done) => {
    done();
  });
});
