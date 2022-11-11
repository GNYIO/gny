/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const GNY_PORT = 16096;
const GNY_APP_NAME = 'app13';
const NETWORK_PREFIX = '172.32';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

describe('uia', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const uiaApi = connection.contract.Uia;

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

  describe('/registerIssuer', () => {
    it(
      'should register issuer',
      async () => {
        expect.assertions(1);

        const name = 'ABC';
        const desc = 'some desc';
        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        const response = await uiaApi.registerIssuer(name, desc, secret);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });

  describe('/registerAsset', () => {
    it(
      'should register asset',
      async () => {
        expect.assertions(1);

        const name = 'BBB';
        const desc = 'some desc';
        const maximum = String(10 * 1e8);
        const precision = 8;
        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        // register issuer
        await uiaApi.registerIssuer(name, desc, secret);
        await lib.onNewBlock(GNY_PORT);

        const response = await uiaApi.registerAsset(
          name,
          desc,
          maximum,
          precision,
          secret
        );
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });
});
