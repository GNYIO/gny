/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import { ApiSuccess } from '@gny/interfaces';
import * as lib from './lib';

const GNY_PORT = 8096;
const GNY_APP_NAME = 'app5';
const NETWORK_PREFIX = '172.24';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

describe('loader', () => {
  const connection = new Connection('127.0.0.1', GNY_PORT, 'localnet', false);
  const loaderApi = connection.api.Loader;

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

  describe('/getStatus', () => {
    it(
      'should get status',
      async () => {
        expect.assertions(1);

        const response = (await loaderApi.getStatus()) as ApiSuccess;
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/syncStatus', () => {
    it(
      'should sync status',
      async () => {
        expect.assertions(1);

        const response = (await loaderApi.syncStatus()) as ApiSuccess;
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
