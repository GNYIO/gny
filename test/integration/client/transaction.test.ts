/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const GNY_PORT = 11096;
const GNY_APP_NAME = 'app8';
const NETWORK_PREFIX = '172.27';
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

async function send() {
  const amount = 5 * 1e8;
  const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
  const message = '';

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
}

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

describe('transaction', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet',
    false
  );
  const transactionApi = connection.api.Transaction;

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

  describe('/getTransactions', () => {
    it(
      'should get transactions',
      async done => {
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
        const query = {
          senderId: senderId,
        };
        const response = await transactionApi.getTransactions(query);
        expect(response.success).toBeTruthy();
        done();
      },
      lib.oneMinute
    );
  });

  describe('/count', () => {
    it(
      'get transaction count',
      async done => {
        const response = await transactionApi.getCount();
        expect(response.count).toEqual(203);

        done();
      },
      lib.oneMinute
    );

    it.only(
      'get transaction count from senderId and senderPublicKey',
      async done => {
        await send();
        await send();

        // expect(response.count).toEqual(1);
        const { publicKey } = gnyClient.crypto.getKeys(genesisSecret);
        const genesisAddress = gnyClient.crypto.getAddress(publicKey);

        // check address
        const responseAddress = await transactionApi.getCount({
          senderId: genesisAddress,
        });
        expect(responseAddress.count).toEqual(2);

        // check publicKey
        const responsePblicKey = await transactionApi.getCount({
          senderPublicKey: publicKey,
        });
        expect(responsePblicKey.count).toEqual(2);

        done();
      },
      lib.oneMinute
    );
  });

  describe('/newestFirst', () => {
    it(
      'get 10 of the newest transactions',
      async done => {
        const count = 203;
        const offset = 0;
        const limit = 10;

        const response = await transactionApi.newestFirst({
          count,
          offset,
          limit,
        });

        expect(response.count).toEqual(203);
        expect(response.transactions).toHaveLength(10);

        expect(response.transactions[0].id).toEqual(
          '3c6c6fa4316c63f64bc0ee7374a4635004c2a1a9f0c1e14cac31866a0986c69d'
        );
        expect(response.transactions[1].id).toEqual(
          '91e7c6b7eead8b94d053eee5cba070a1fd4ec93d916ee85459b8dc99e2a18fc0'
        );
        expect(response.transactions[2].id).toEqual(
          'c58cef6e9e4cf4743226650352eb0723e31e3b2ec60e1d49fb959665a488a1ca'
        );
        expect(response.transactions[3].id).toEqual(
          'b75f60435dda71a23108639afa6a99db5901bbfb554f1eae227e1119b45675df'
        );
        expect(response.transactions[4].id).toEqual(
          '13e0ebcba2fff96d50b310fda578746a4d8d120d1ff31f7c0e39349e566fe551'
        );
        expect(response.transactions[5].id).toEqual(
          'fa0e41b0beec51e9a358ec32a8d9eaf9d2345bc916f17915db0465534031251b'
        );
        expect(response.transactions[6].id).toEqual(
          '407f4f695187cd009bbe07025b2ce44b2241c8e6ee34e182501f3658b672a433'
        );
        expect(response.transactions[7].id).toEqual(
          '9533c69180350070cd483d367bff51a94adb5e4f329e2be1780ff0af9080c264'
        );
        expect(response.transactions[8].id).toEqual(
          'c9a1f8cab21e60b3c520e297bb2d2aff115b69889000cb579ec794d83ff35772'
        );
        expect(response.transactions[9].id).toEqual(
          '67387a102b482ef3a0471c082340331d70fa99431add718e452218620bd9549e'
        );

        done();
      },
      lib.oneMinute
    );

    it(
      'should get only transactions of sender x',
      async () => {
        // const response = await transactionApi.newestFirst(count, offset, limit);

        const count = 203;
        const offset = 0;
        const limit = 10;

        const response = await transactionApi.newestFirst({
          count,
          offset,
          limit,
        });
      },
      lib.oneMinute
    );
  });
});
