import { CustomCache } from '../../../packages/database-postgres/src/customCache';

describe('orm - CustomCache', () => {
  it('creation', (done) => {
    const modelSchema: any = {
    };
    const sut = new CustomCache(modelSchema, 5000);
  });
  it.skip('set onEvit callback', (done) => {
    done();
  });
  it.skip('onEvit() executes registered callback', (done) => {
    done();
  });
  it.skip('test max cache, size 2, add 3 items, first should not be there', (done) => {
    done();
  });
  it.skip('forEach returns every itme that is available', (done) => {
    done();
  });
  it.skip('exists', (done) => {
    done();
  });
  it.skip('evit item', (done) => {
    done();
  });
  it.skip('clear all items', (done) => {
    done();
  });
  // exist() and has() are doing the same thing
});
