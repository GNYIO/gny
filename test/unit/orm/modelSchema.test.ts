import * as sinon from 'sinon';
import { getConnection, EntityMetadata } from 'typeorm';
import { ModelSchema, MetaSchema } from '../../../packages/database-postgres/src/modelSchema';
import { ModelIndex } from'../../../packages/database-postgres/src/defaultEntityUniqueIndex';


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
    expect(sut.properties).toEqual(['address', 'username']);
    done();
  });
  it('prop primaryKey', (done) => {
    expect(sut.primaryKey).toEqual('address');
    done();
  });
});
