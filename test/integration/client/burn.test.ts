/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const GNY_PORT = 15096;
const GNY_APP_NAME = 'app12';
const NETWORK_PREFIX = '172.30';
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
  const burnApi = connection.api.Burn;

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

  describe('Get burn information', () => {
    describe('/', () => {
      it(
        'on the start there should be no burned tokens',
        async () => {
          expect.assertions(4);

          const response = await burnApi.getAll();
          expect(response.success).toBeTruthy();
          // @ts-ignore
          expect(Array.isArray(response.burn)).toEqual(true);
          // @ts-ignore
          expect(response.burn).toHaveLength(0);
          // @ts-ignore
          expect(response.count).toEqual(0);
        },
        lib.oneMinute
      );

      it(
        'filter by senderId',
        async () => {
          // transfer first GNY to 2 other accounts so we
          // have 3 different accounts (with the genesis account)
          // that are burning tokens
          // and we can filter based on "senderId"

          const genesisSecret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const secret1 =
            'jelly vivid magnet actor brass critic inject crystal slender coconut step maple';
          const secret2 =
            'strong music orange diary orchard recycle grape immense hope evil topple nuclear';

          const genesisAddress = gnyClient.crypto.getAddress(
            gnyClient.crypto.getKeys(genesisSecret).publicKey
          );
          const address1 = gnyClient.crypto.getAddress(
            gnyClient.crypto.getKeys(secret1).publicKey
          );
          const address2 = gnyClient.crypto.getAddress(
            gnyClient.crypto.getKeys(secret2).publicKey
          );

          await connection.contract.Basic.send(
            address1,
            String(5000 * 1e8),
            genesisSecret
          );
          await connection.contract.Basic.send(
            address2,
            String(5000 * 1e8),
            genesisSecret
          );

          await lib.onNewBlock(GNY_PORT);
          await lib.onNewBlock(GNY_PORT);

          await connection.contract.Basic.burn(
            String(3000 * 1e8),
            genesisSecret
          );
          await connection.contract.Basic.burn(String(2000 * 1e8), secret1);
          await connection.contract.Basic.burn(String(1000 * 1e8), secret2);

          await lib.onNewBlock(GNY_PORT);

          const allBurn = await burnApi.getAll(100, 0);
          console.log(JSON.stringify(allBurn, null, 2));
          expect(allBurn.success).toEqual(true);
          // @ts-ignore
          expect(allBurn.count).toEqual(3);
          // @ts-ignore
          expect(allBurn.burn).toHaveLength(3);

          // get only first element
          const allFirstOnly = await burnApi.getAll(1, 0);
          expect(allFirstOnly.success).toEqual(true);
          // @ts-ignore
          expect(allFirstOnly.count).toEqual(3);
          // @ts-ignore
          expect(allFirstOnly.burn).toHaveLength(1);
          // @ts-ignore
          expect(allFirstOnly.burn[0]).toEqual(allBurn.burn[0]);

          // get only second element
          const allSecondOnly = await burnApi.getAll(1, 1);
          expect(allSecondOnly.success).toEqual(true);
          // @ts-ignore
          expect(allSecondOnly.count).toEqual(3);
          // @ts-ignore
          expect(allSecondOnly.burn).toHaveLength(1);
          // @ts-ignore
          expect(allSecondOnly.burn[0]).toEqual(allBurn.burn[1]);

          // get only third element
          const allThirdOnly = await burnApi.getAll(1, 2);
          expect(allThirdOnly.success).toEqual(true);
          // @ts-ignore
          expect(allThirdOnly.count).toEqual(3);
          // @ts-ignore
          expect(allThirdOnly.burn).toHaveLength(1);
          // @ts-ignore
          expect(allThirdOnly.burn[0]).toEqual(allBurn.burn[2]);

          // get only burns from genesis address
          const genesisOnly = await burnApi.getAll(100, 0, genesisAddress);
          expect(genesisOnly.success).toEqual(true);
          // @ts-ignore
          expect(genesisOnly.count).toEqual(1);
          // @ts-ignore
          expect(genesisOnly.burn).toHaveLength(1);
          // @ts-ignore
          expect(genesisOnly.burn[0].senderId).toEqual(genesisAddress);
          // @ts-ignore
          expect(genesisOnly.burn[0].amount).toEqual(String(3000 * 1e8));

          // get only burns from address1
          const address1Only = await burnApi.getAll(100, 0, address1);
          expect(address1Only.success).toEqual(true);
          // @ts-ignore
          expect(address1Only.count).toEqual(1);
          // @ts-ignore
          expect(address1Only.burn).toHaveLength(1);
          // @ts-ignore
          expect(address1Only.burn[0].senderId).toEqual(address1);
          // @ts-ignore
          expect(address1Only.burn[0].amount).toEqual(String(2000 * 1e8));

          // get only burns from address2
          const address2Only = await burnApi.getAll(100, 0, address2);
          expect(address2Only.success).toEqual(true);
          // @ts-ignore
          expect(address2Only.count).toEqual(1);
          // @ts-ignore
          expect(address2Only.burn).toHaveLength(1);
          // @ts-ignore
          expect(address2Only.burn[0].senderId).toEqual(address2);
          // @ts-ignore
          expect(address2Only.burn[0].amount).toEqual(String(1000 * 1e8));
        },
        lib.oneMinute * 2
      );
    });
  });
});
