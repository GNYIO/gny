/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from './lib';
import { ApiSuccess } from '@gny/interfaces';

const GNY_PORT = 10096;
const GNY_APP_NAME = 'app7';
const NETWORK_PREFIX = '172.26';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

describe('system', () => {
  const connection = new Connection('127.0.0.1', GNY_PORT, 'localnet', false);
  const systemApi = connection.api.System;

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

  describe('/getSystemInfo', () => {
    it(
      'should get system information',
      async () => {
        expect.assertions(1);

        const response = (await systemApi.getSystemInfo()) as ApiSuccess;
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
