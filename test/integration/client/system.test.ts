/**
 * @jest-environment jsdom
 */
import { Connection } from '@gnyio/client';
import * as lib from './lib';
import { ApiSuccess } from '@gnyio/interfaces';
import 'jest-extended';

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
  }, lib.oneMinute * 3);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('/getSystemInfo', () => {
    it(
      'should get system information',
      async () => {
        expect.assertions(1);

        const response = (await systemApi.getSystemInfo()) as ApiSuccess;

        expect(response).toEqual({
          success: true,
          os: expect.any(String),
          timestamp: lib.matchPositiveNumber,
          lastBlock: {
            height: lib.matchHeightString,
            timestamp: lib.matchPositiveNumber,
            behind: expect.any(Number),
          },
          p2p: lib.matchP2PVersion,
          network: lib.matchNetwork,
          version: lib.matchSemver,
        });
      },
      lib.oneMinute
    );
  });
});
