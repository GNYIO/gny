/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const GNY_PORT = 12096;
const GNY_APP_NAME = 'app9';
const NETWORK_PREFIX = '172.28';
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

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

describe('transfer', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const transferApi = connection.api.Transfer;

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

  describe('/getRoot', () => {
    it(
      'should get the root',
      async () => {
        expect.assertions(1);

        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
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
        const transData = {
          transaction: trs,
        };

        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);
        const query = { ownerId: senderId };
        const response = await transferApi.getRoot(query);
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getAmount', () => {
    it(
      'should get the amount according to an interval of timestamp',
      async () => {
        expect.assertions(1);

        const senderId = 'G2ofFMDz8GtWq9n65khKit83bWkQr';
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
        const transData = {
          transaction: trs,
        };

        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const trsData = await axios.get(
          `http://localhost:${GNY_PORT}/api/transfers?ownerId=${senderId}`
        );

        // get the amount
        const startTimestamp = trsData.data.transfers[0].timestamp;
        const endTimestamp = startTimestamp + 10000;
        const response = await transferApi.getAmount(
          startTimestamp,
          endTimestamp
        );
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
