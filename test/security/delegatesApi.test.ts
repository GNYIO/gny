import * as lib from './lib';
import axios from 'axios';

describe('delegatesApi', () => {
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
      'should return error: Invalid params',
      async () => {
        const offset1 = 1;
        const offset2 = 2;
        const delegatePromise = axios.get(
          'http://localhost:4096/api/delegates/' +
            '?offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(delegatePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid params',
        });
      },
      lib.oneMinute
    );

    it(
      'should return: Invalid params',
      async () => {
        const limit1 = 10;
        const limit2 = 11;
        const delegatePromise = axios.get(
          'http://localhost:4096/api/delegates/' +
            '?limit=' +
            limit1 +
            '&limit=' +
            limit2
        );

        expect(delegatePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid params',
        });
      },
      lib.oneMinute
    );
  });
});
