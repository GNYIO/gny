/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gnyio/client';
import axios from 'axios';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const GNY_PORT = 20096;
const GNY_APP_NAME = 'app20';
const NETWORK_PREFIX = '172.56';
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

describe('verify', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );

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

  describe('Create verification', () => {
    it(
      'should set username',
      async () => {
        // expect.assertions(1);

        const trs = await gnyClient.verification.createVerification(
          'MY_IDENTIFIER',
          'b01b781b89b7f6b7de1fba0cc992bf528f8422e3960e087f396cc83014028ad891bd848c2405b47419fdba643ce2206e1bad18a540b1a64e84d04c0c6aa1a40f',
          genesisSecret
        );

        await lib.onNewBlock(GNY_PORT);

        try {
          const oneVerification = await connection.api.Verification.get(
            'MY_IDENTIFIER'
          );
          console.log(oneVerification);
        } catch (err) {
          console.log(err.response ? err.response.data : err.message);
        }

        try {
          const allVerifications = await connection.api.Verification.getAll(
            100,
            0
          );
          console.log(allVerifications);
        } catch (err) {
          console.log(err.response ? err.response.data : err.message);
        }

        // expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });
});
