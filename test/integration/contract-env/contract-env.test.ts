import * as lib from '../lib';

const oneMinute = 60 * 1000;
const tenMinutes = 10 * 60 * 1000;

describe('contract environment', () => {
  beforeAll(async done => {
    await lib.buildDockerImage();
    done();
  }, tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, oneMinute);

  it(
    'check blocks',
    async done => {
      const height = await lib.getHeight();
      expect(typeof height).toEqual('number');

      done();
    },
    oneMinute
  );
});
