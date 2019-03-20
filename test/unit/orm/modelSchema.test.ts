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
      propertiesMap: {
        address: 'address',
        username: 'username',
        gny: 0,
      },
    };
    sut = new ModelSchema(entityMetadata);
  });


  it('hasUniqueProperty("gny") -> false', (done) => {
    // called with ["gny"]
    // checks if uniquePropertiesSet has ["username"] (Set)
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
      propertiesMap: {
      },
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
      propertiesMap: {
      },
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
      propertiesMap: {
      },
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
      propertiesMap: {
      },
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
      propertiesMap: {
      },
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
});
