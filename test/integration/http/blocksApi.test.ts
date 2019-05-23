import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

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
        const height = 2;
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/blocks/getBlock?height=' + height
        );
        expect(data.block.height).toBe(2);
      },
      lib.oneMinute
    );
  });

  describe('/', () => {
    it(
      'should get blocks',
      async () => {
        // wait 1 block;
        await lib.onNewBlock();

        const { data } = await axios.get('http://localhost:4096/api/blocks');
        expect(data.count).toBe(3);
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
        expect(data.height).toBe(4);
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
          height: 1,
          fee: 10000000,
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
