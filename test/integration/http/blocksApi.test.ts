import * as lib from '../lib';
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
        const height = String(2);
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );
        expect(data.block.height).toBe(String(2));
      },
      lib.oneMinute
    );
  });

  describe('/', () => {
    it(
      'should get blocks with offset and limit query parameters',
      async () => {
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();
        const offset = 1;
        const limit = 3;

        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/?offset=' +
            offset +
            '&limit=' +
            limit
        );
        expect(data.blocks.length).toBe(3);
      },
      lib.oneMinute
    );

    it(
      'should return error: "offset" must be larger than or equal to 0',
      async () => {
        // wait 1 block;
        await lib.onNewBlock();

        const offset = -1;

        const promise = axios.get(
          'http://localhost:4096/api/blocks/?offset=' + offset
        );
        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "offset" fails because ["offset" must be larger than or equal to 0]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be less than or equal to 100',
      async () => {
        // wait 1 block;
        await lib.onNewBlock();
        const limit = 101;

        const promise = axios.get(
          'http://localhost:4096/api/blocks/?limit=' + limit
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "limit" fails because ["limit" must be less than or equal to 100]',
        });
      },
      lib.oneMinute
    );
  });

  describe('/getHeight', () => {
    it(
      'should get the height of the last block',
      async () => {
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getHeight'
        );
        expect(data.height).toBe(String(4));
      },
      lib.oneMinute
    );
  });

  describe('/getMilestone', () => {
    it(
      'should get the milestone',
      async () => {
        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getMilestone'
        );
        expect(data.milestone).toBe(0);
      },
      lib.oneMinute
    );
  });

  describe('/getReward', () => {
    it(
      'should get the reward',
      async () => {
        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getReward'
        );
        expect(data.reward).toBe(0);
      },
      lib.oneMinute
    );
  });

  describe('/getSupply', () => {
    it(
      'should get the supply',
      async () => {
        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getSupply'
        );
        expect(data.supply).toBe('40000000000000000');
      },
      lib.oneMinute
    );
  });

  describe('/getStatus', () => {
    it(
      'should get the status',
      async () => {
        const expected = {
          height: String(1),
          fee: String(10000000),
          milestone: 0,
          reward: 0,
          supply: '40000000000000000',
        };
        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getStatus'
        );
        expect(data).toEqual(expected);
      },
      lib.oneMinute
    );
  });
});
