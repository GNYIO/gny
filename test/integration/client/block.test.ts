/**
 * @jest-environment jsdom
 */
import { Connection } from '@gnyio/client';
import {
  ApiResult,
  ApiSuccess,
  BlockWrapper,
  SupplyWrapper,
} from '@gnyio/interfaces';
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
  }, lib.oneMinute * 3);

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

        expect(response).toEqual({
          success: true,
          block: {
            id: lib.matchId,
            version: expect.any(Number),
            timestamp: lib.matchPositiveNumber,
            height: lib.matchPositiveOrZeroIntString,
            prevBlockId: lib.matchId,
            count: expect.any(Number),
            fees: lib.matchPositiveOrZeroIntString,
            reward: lib.matchPositiveOrZeroIntString,
            payloadHash: lib.matchId,
            delegate: lib.matchPublicKey,
            signature: lib.matchSignature,
          },
        });
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

        expect(response).toEqual({
          success: true,
          block: {
            id: lib.matchId,
            version: expect.any(Number),
            timestamp: lib.matchPositiveNumber,
            height: lib.matchPositiveOrZeroIntString,
            prevBlockId: lib.matchId,
            count: expect.any(Number),
            fees: lib.matchPositiveOrZeroIntString,
            reward: lib.matchPositiveOrZeroIntString,
            payloadHash: lib.matchId,
            delegate: lib.matchPublicKey,
            signature: lib.matchSignature,
          },
        });
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

        expect(response).toEqual({
          success: true,
          count: lib.matchPositiveNumber,
          blocks: [
            {
              id: lib.matchId,
              version: expect.any(Number),
              timestamp: 0,
              height: '0',
              prevBlockId: null,
              count: expect.any(Number),
              fees: lib.matchPositiveOrZeroIntString,
              reward: lib.matchPositiveOrZeroIntString,
              payloadHash: lib.matchId,
              delegate: lib.matchPublicKey,
              signature: lib.matchSignature,
            },
            {
              id: lib.matchId,
              version: expect.any(Number),
              timestamp: lib.matchPositiveNumber,
              height: '1',
              prevBlockId: lib.matchId,
              count: expect.any(Number),
              fees: lib.matchPositiveOrZeroIntString,
              reward: lib.matchPositiveOrZeroIntString,
              payloadHash: lib.matchId,
              delegate: lib.matchPublicKey,
              signature: lib.matchSignature,
            },
          ],
        });
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
        expect(response).toEqual({
          success: true,
          height: lib.matchPositiveOrZeroIntString,
        });
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

        expect(response).toEqual({
          success: true,
          milestone: expect.any(Number),
        });
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
        // expect(response.success).toBeTruthy();
        expect(response).toEqual({
          success: true,
          reward: expect.any(Number), // why number not BigIntString?
        });
      },
      lib.oneMinute
    );
  });

  describe('/getSupply', () => {
    it(
      'should get the supply',
      async () => {
        expect.assertions(5);

        const response: ApiResult<SupplyWrapper> = await blockApi.getSupply();

        expect(response.success).toEqual(true);
        // @ts-ignore
        expect(response.deprecated).toEqual(String(400_000_000 * 1e8));
        // @ts-ignore
        expect(response.burned).toEqual(String(0));
        // @ts-ignore
        expect(response.supply).toEqual(String(400_000_000 * 1e8));

        // make sure there is no additional properties
        expect(Object.keys(response).length).toEqual(4);
      },
      lib.oneMinute
    );

    it(
      'supply should decrease when token were burned',
      async () => {
        expect.assertions(5);

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

        // make sure there is no additional properties
        expect(Object.keys(response).length).toEqual(4);
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
        expect(response).toEqual({
          success: true,
          fee: lib.matchPositiveOrZeroIntString,
          height: lib.matchPositiveOrZeroIntString,
          milestone: expect.any(Number),
          reward: expect.any(Number),
          supply: lib.matchPositiveOrZeroIntString,
        });
      },
      lib.oneMinute
    );
  });
});
