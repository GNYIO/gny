import * as lib from '../integration/lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('transportApi', () => {
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

  describe('/blocks', () => {
    it(
      'should return error: Invalid params',
      async () => {
        const height = 1;
        // wait 2 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();

        const blockData = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );

        // get common block
        const query = {
          limit: [1, 2],
          lastBlockId: blockData.data.block.id,
        };

        const transpPromise = axios.post(
          'http://localhost:4096/peer/blocks',
          query,
          config
        );
        expect(transpPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Invalid params',
        });
        expect(transpPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );
  });
});
