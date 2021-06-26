/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
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

  describe('/getStatus', () => {
    it(
      'should get status',
      async () => {
        const response = await loaderApi.getStatus();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/syncStatus', () => {
    it(
      'should sync status',
      async () => {
        const response = await loaderApi.syncStatus();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
