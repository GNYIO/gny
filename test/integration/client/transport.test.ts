/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';

const GNY_PORT = 13096;
const GNY_APP_NAME = 'app10';
const NETWORK_PREFIX = '172.29';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

describe('transport', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const transportApi = connection.api.Transport;

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

  describe('/sendTransaction', () => {
    it(
      'should execute one transaction',
      async () => {
        expect.assertions(1);

        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Transaction
        const trs = gnyClient.basic.transfer(
          recipient,
          String(amount),
          message,
          genesisSecret
        );

        const response = await transportApi.sendTransaction(trs);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });
});
