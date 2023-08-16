/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import {
  ApiResult,
  ApiSuccess,
  BlockWrapper,
  SupplyWrapper,
} from '@gny/interfaces';
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

  beforeAll(async () => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
  }, lib.oneMinute);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('/getBlockByHeight', () => {
    it(
      'should get the block by height',
      async () => {
        expect.assertions(1);

        // wait 3 blocks;
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const height = String(2);
        const response = (await blockApi.getBlockByHeight(
          height
        )) as ApiSuccess;
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getBlockById', () => {
    it(
      'should get the block by id',
      async () => {
        expect.assertions(1);

        // wait 3 blocks;
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const height = String(2);
        const blockResponse = (await blockApi.getBlockByHeight(
          height
        )) as (ApiSuccess & BlockWrapper);
        const id = blockResponse.block.id;
        const response = await blockApi.getBlockById(id);
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getBlocks', () => {
    it(
      'should get the blocks',
      async () => {
        expect.assertions(1);

        const offset = '0';
        const limit = '2';

        // wait 3 blocks;
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const response = await blockApi.getBlocks(offset, limit);
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getHeight', () => {
    it(
      'should get the height',
      async () => {
        expect.assertions(1);

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
        expect.assertions(1);

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
        expect.assertions(1);

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
        expect.assertions(4);

        const response: ApiResult<SupplyWrapper> = await blockApi.getSupply();

        expect(response.success).toEqual(true);
        // @ts-ignore
        expect(response.deprecated).toEqual(String(400_000_000 * 1e8));
        // @ts-ignore
        expect(response.burned).toEqual(String(0));
        // @ts-ignore
        expect(response.supply).toEqual(String(400_000_000 * 1e8));
      },
      lib.oneMinute
    );

    it(
      'supply should decrease when token were burned',
      async () => {
        expect.assertions(4);

        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        const trs1 = connection.contract.Basic.burn(
          String(1_000_000 * 1e8),
          secret,
          undefined
        );
        await lib.onNewBlock(GNY_PORT);

        const trs2 = connection.contract.Basic.burn(
          String(1_000_000 * 1e8),
          secret,
          undefined
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await blockApi.getSupply();

        expect(response.success).toEqual(true);
        // @ts-ignore
        expect(response.deprecated).toEqual(String(400_000_000 * 1e8));
        // @ts-ignore
        expect(response.burned).toEqual(String(2_000_000 * 1e8));
        // @ts-ignore
        expect(response.supply).toEqual(String(398_000_000 * 1e8));
      },
      lib.oneMinute * 2
    );
  });

  describe('/getStatus', () => {
    it(
      'should get status',
      async () => {
        expect.assertions(1);

        const response = await blockApi.getStatus();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
