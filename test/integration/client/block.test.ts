/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from './lib';

const GNY_PORT = 5096;
const GNY_APP_NAME = 'app2';
const NETWORK_PREFIX = '172.21';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

describe('block', () => {
  const connection = new Connection('127.0.0.1', GNY_PORT, 'localnet', false);
  const blockApi = connection.api.Block;

  beforeAll(async done => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();

    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
    done();
  }, lib.oneMinute);

  describe('/getBlockByHeight', () => {
    it(
      'should get the block by height',
      async done => {
        // wait 3 blocks;
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const height = String(2);
        const response = await blockApi.getBlockByHeight(height);
        expect(response.success).toBeTruthy();
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
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const height = String(2);
        const blockResponse = await blockApi.getBlockByHeight(height);
        const id = blockResponse.block.id;
        const response = await blockApi.getBlockById(id);
        expect(response.success).toBeTruthy();
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
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const response = await blockApi.getBlocks(offset, limit);
        expect(response.success).toBeTruthy();
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
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getMilestone', () => {
    it(
      'should get the milestone',
      async () => {
        const response = await blockApi.getMilestone();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getReward', () => {
    it(
      'should get the reward',
      async () => {
        const response = await blockApi.getReward();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getSupply', () => {
    it(
      'should get the supply',
      async () => {
        const response = await blockApi.getSupply();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getStatus', () => {
    it(
      'should get status',
      async () => {
        const response = await blockApi.getStatus();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
