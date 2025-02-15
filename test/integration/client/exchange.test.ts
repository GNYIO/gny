/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gnyio/client';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const GNY_PORT = 7096;
const GNY_APP_NAME = 'app4';
const NETWORK_PREFIX = '172.23';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX,
  true
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';
// EXCHANGE_API=true

describe('exchange', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet',
    false
  );
  const exchangeApi = connection.api.Exchange;

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

  describe('Get account information', () => {
    describe('/openAccount', () => {
      it(
        'should open an account with a secret',
        async () => {
          expect.assertions(1);

          const secret = genesisSecret;
          const response = await exchangeApi.openAccount(secret);

          expect(response).toEqual({
            success: true,
            account: {
              address: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
              balance: lib.matchPositiveOrZeroIntString,
              isDelegate: 0,
              lockAmount: lib.matchPositiveOrZeroIntString,
              lockHeight: lib.matchPositiveOrZeroIntString,
              publicKey: lib.matchPublicKey,
              secondPublicKey: null,
              username: null,
            },
            latestBlock: {
              height: lib.matchPositiveOrZeroIntString,
              timestamp: lib.matchPositiveNumber,
            },
            version: {
              build: expect.any(String),
              net: lib.matchNetwork,
              version: lib.matchSemver,
            },
          });
        },
        lib.oneMinute
      );
    });

    describe('/generateAccount', () => {
      it(
        'should return a complete new account',
        async () => {
          expect.assertions(1);

          const response = await exchangeApi.generateAccount();
          expect(response).toEqual({
            success: true,
            address: expect.any(String),
            privateKey: expect.any(String),
            publicKey: lib.matchPublicKey,
            secret: expect.any(String),
          });
        },
        lib.oneMinute
      );
    });

    describe('/generatePublicKey', () => {
      it(
        'should generate a public key from a secret',
        async () => {
          expect.assertions(1);

          const secret = genesisSecret;
          const response = await exchangeApi.generatePublicKey(secret);
          expect(response).toEqual({
            success: true,
            publicKey: lib.matchPublicKey,
          });
        },
        lib.oneMinute
      );
    });
  });
});
