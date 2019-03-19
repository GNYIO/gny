import * as sinon from 'sinon';
import { getConnection, EntityMetadata } from 'typeorm';
import { ModelSchema, MetaSchema } from '../../../packages/database-postgres/src/modelSchema';
import { ModelIndex } from'../../../packages/database-postgres/src/defaultEntityUniqueIndex';


describe('orm - ModelSchema', () => {
  let sut: ModelSchema;
  beforeEach(() => {
    const entityMetadata: MetaSchema = {
      memory: false,
      maxCachedCount: Number.POSITIVE_INFINITY,
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
      propertiesMap: new Map(),
    };
    sut = new ModelSchema(entityMetadata);
  });


  it('hasUniqueProperty(["gny"]) -> false', (done) => {
    // called with ["gny"]
    // checks if uniquePropertiesSet has ["username"] (Set)
    const result = sut.hasUniqueProperty('gny');
    expect(result).toEqual(false);
    done();
  });
  it('hasUniqueProperty(["username"]) -> true', (done) => {
    const result = sut.hasUniqueProperty('username');
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
});
