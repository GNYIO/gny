import * as lib from './lib';
import axios from 'axios';

describe('blocksApi', () => {
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

  describe('/getBlock', () => {
    it(
      'should get the block with a specific height',
      async () => {
        const height1 = String(2);
        const height2 = String(3);
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const blockPromise = axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' +
            height1 +
            '&height=' +
            height2
        );
        expect(blockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "height" fails because ["height" must be a number, "height" must be a string]',
        });
        expect(blockPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );
  });

  describe('/', () => {
    it(
      'should return error: "offset" must be larger than or equal to 0',
      async () => {
        // wait 1 block;
        await lib.onNewBlock();

        const offset = -1;

        const blockPromise = axios.get(
          'http://localhost:4096/api/blocks/?offset=' + offset
        );
        expect(blockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "offset" fails because ["offset" must be larger than or equal to 0]',
        });
        expect(blockPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be less than or equal to 100',
      async () => {
        // wait 1 block;
        await lib.onNewBlock();
        const limit = 101;

        const blockPromise = axios.get(
          'http://localhost:4096/api/blocks/?limit=' + limit
        );

        expect(blockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "limit" fails because ["limit" must be less than or equal to 100]',
        });
        expect(blockPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );

    it(
      'should return error: offset must be a number',
      async () => {
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        const offset1 = 1;
        const offset2 = 2;

        const blockPromise = axios.get(
          'http://localhost:4096/api/blocks/?offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(blockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
        expect(blockPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );

    it(
      'should return error: limit must be a number',
      async () => {
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        const limit1 = 1;
        const limit2 = 2;

        const blockPromise = axios.get(
          'http://localhost:4096/api/blocks/?limit=' +
            limit1 +
            '&limit=' +
            limit2
        );
        expect(blockPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
        expect(blockPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );
  });
});
