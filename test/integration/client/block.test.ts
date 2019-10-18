/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from '../lib';

describe('block', () => {
  const connection = new Connection();
  const blockApi = connection.api.Block;

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

  describe('/getBlockByHeight', () => {
    it(
      'should get the block by height',
      async done => {
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const height = String(2);
        const response = await blockApi.getBlockByHeight(height);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getBlockById', () => {
    it(
      'should get the block by id',
      async done => {
        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const height = String(2);
        const { data } = await blockApi.getBlockByHeight(height);
        const id = data.block.id;
        const response = await blockApi.getBlockById(id);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getBlocks', () => {
    it(
      'should get the blocks',
      async done => {
        const offset = '0';
        const limit = '2';

        // wait 3 blocks;
        await lib.onNewBlock();
        await lib.onNewBlock();
        await lib.onNewBlock();

        const response = await blockApi.getBlocks(offset, limit);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getHeight', () => {
    it(
      'should get the height',
      async () => {
        const response = await blockApi.getHeight();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getMilestone', () => {
    it(
      'should get the milestone',
      async () => {
        const response = await blockApi.getMilestone();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getReward', () => {
    it(
      'should get the reward',
      async () => {
        const response = await blockApi.getReward();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getSupply', () => {
    it(
      'should get the supply',
      async () => {
        const response = await blockApi.getSupply();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getStatus', () => {
    it(
      'should get status',
      async () => {
        const response = await blockApi.getStatus();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
