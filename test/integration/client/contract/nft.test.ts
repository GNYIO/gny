/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';

const GNY_PORT = 15096;
const GNY_APP_NAME = 'app12';
const NETWORK_PREFIX = '172.31';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('nft', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const nftApi = connection.contract.Nft;

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

  describe('Nft Maker', () => {
    describe('create nft maker', () => {
      it(
        'create nft maker',
        async () => {
          expect.assertions(3);

          const nftmaker = 'mynftmaker';
          const desc = 'first nft maker';
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const response = await nftApi.registerNftMaker(
            nftmaker,
            desc,
            undefined,
            secret
          );
          expect(response).toHaveProperty('transactionId');

          await lib.onNewBlock(GNY_PORT);

          const result = await connection.api.Nft.getNftMakers();
          // @ts-ignore
          expect(result.makers).toHaveLength(1);
          // @ts-ignore
          expect(result.makers[0]).toEqual({
            _version_: 1,
            desc: desc,
            makerId: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
            name: nftmaker,
            // @ts-ignore
            tid: response.transactionId,
          });
        },
        lib.oneMinute
      );
    });
  });
});
