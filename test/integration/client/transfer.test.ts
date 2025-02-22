/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gnyio/client';
import axios from 'axios';
import { ApiSuccess } from '@gnyio/interfaces';

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
  }, lib.oneMinute * 3);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('/getRoot', () => {
    it(
      'should get the root',
      async () => {
        expect.assertions(1);

        // genesis account
        const senderId = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );
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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);
        await lib.onNewBlock(GNY_PORT);

        const query = { ownerId: senderId };

        // returns newest transfers first
        const response = (await transferApi.getRoot(query)) as ApiSuccess;
        expect(response).toEqual({
          count: 2,
          success: true,
          transfers: [
            {
              _version_: lib.matchPositiveNumber,
              amount: lib.matchPositiveOrZeroIntString,
              currency: 'GNY',
              height: lib.matchPositiveOrZeroIntString,
              recipientId: 'GuQr4DM3aiTD36EARqDpbfsEHoNF',
              recipientName: null,
              senderId: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
              tid: lib.matchTid,
              timestamp: lib.matchPositiveNumber,
              transaction: {
                _version_: lib.matchPositiveNumber,
                args: expect.any(String),
                fee: lib.matchPositiveOrZeroIntString,
                height: lib.matchPositiveOrZeroIntString,
                id: lib.matchId,
                message: expect.any(String),
                secondSignature: null,
                senderId: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
                senderPublicKey: lib.matchPublicKey,
                signatures: expect.any(String),
                timestamp: lib.matchPositiveNumber,
                type: 0,
                placement: expect.any(Number),
              },
            },
            {
              _version_: lib.matchPositiveNumber,
              amount: lib.matchPositiveOrZeroIntString,
              currency: 'GNY',
              height: lib.matchPositiveOrZeroIntString,
              recipientId: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
              recipientName: null,
              senderId: 'G3ZVTpgNYPi1proETRSSQdn6jQB9n',
              tid: lib.matchTid,
              timestamp: 0, // in genesis block
              transaction: {
                _version_: lib.matchPositiveNumber,
                args: expect.any(String),
                fee: lib.matchPositiveOrZeroIntString,
                height: lib.matchPositiveOrZeroIntString,
                id: lib.matchId,
                message: '',
                secondSignature: null,
                senderId: 'G3ZVTpgNYPi1proETRSSQdn6jQB9n',
                senderPublicKey: lib.matchPublicKey,
                signatures: expect.any(String),
                timestamp: 0, // in genesis block
                type: 0,
                placement: expect.any(Number),
              },
            },
          ],
        });
      },
      lib.oneMinute
    );
  });

  describe('/getAmount', () => {
    it(
      'should get the amount according to an interval of timestamp',
      async () => {
        expect.assertions(1);

        // genesis account
        const senderId = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );
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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const trsData = await axios.get(
          `http://127.0.0.1:${GNY_PORT}/api/transfers?ownerId=${senderId}`
        );

        // get the amount
        const startTimestamp = trsData.data.transfers[0].timestamp;
        const endTimestamp = startTimestamp + 10000;
        const response = (await transferApi.getAmount(
          startTimestamp,
          endTimestamp
        )) as ApiSuccess;
        expect(response).toEqual({
          success: true,
          count: 1,
          strTotalAmount: '500000000', // TODO: rename
        });
      },
      lib.oneMinute
    );
  });
});
