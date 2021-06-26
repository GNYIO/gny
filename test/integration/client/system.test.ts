/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from './lib';

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

  describe('/getSystemInfo', () => {
    it(
      'should get system information',
      async () => {
        const response = await systemApi.getSystemInfo();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
