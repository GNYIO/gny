import * as lib from '../lib';
import axios from 'axios';

describe('systemApi', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  describe('/', () => {
    it(
      'should get the system info',
      async done => {
        const { data } = await axios.get('http://localhost:4096/api/system');
        expect(data).toHaveProperty('os');
        expect(data).toHaveProperty('version');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('lastBlock');
        done();
      },
      lib.oneMinute
    );
  });
});
