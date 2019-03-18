import { LRUEntityCache } from '../../../packages/database-postgres/src/lruEntityCache';
import { ModelSchema } from '../../../packages/database-postgres/src/modelSchema';


describe('orm - LRUEntityCache', () => {
  let sut: LRUEntityCache;
  beforeEach(() => {
    const modelSchemas = new Map<string, ModelSchema>();

    sut = new LRUEntityCache(modelSchemas);
  });

  it.skip('creation', (done) => {
    done();
  });
  it.skip('no model x -> existsModel() should return false', (done) => {
    done();
  });
  it.skip('modelSchema x exists -> existsModel() should return true', (done) => {
    done();
  });
});