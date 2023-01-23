/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

const GNY_PORT = 15096;
const GNY_APP_NAME = 'app12';
const NETWORK_PREFIX = '172.31';
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

async function prepareDelegates(delegates: string[]) {
  // send 200,000 GNY to every delegate in the list
  for (let i = 0; i < delegates.length; ++i) {
    const del = delegates[i];
    const recipientAddress = gnyClient.crypto.getAddress(
      gnyClient.crypto.getKeys(del).publicKey
    );
    const nameTrs = gnyClient.basic.transfer(
      recipientAddress,
      String(200000 * 1e8),
      (undefined as never) as string,
      genesisSecret
    );
    const nameTransData = {
      transaction: nameTrs,
    };
    await axios.post(
      `http://localhost:${GNY_PORT}/peer/transactions`,
      nameTransData,
      config
    );
  }
  await lib.onNewBlock(GNY_PORT);

  // delegates lock 190,000 GNY
  for (let i = 0; i < delegates.length; ++i) {
    const del = delegates[i];
    const nameTrs = gnyClient.basic.lock(
      String(1000000),
      String(190000 * 1e8),
      del
    );
    const nameTransData = {
      transaction: nameTrs,
    };

    await axios.post(
      `http://localhost:${GNY_PORT}/peer/transactions`,
      nameTransData,
      config
    );
  }

  await lib.onNewBlock(GNY_PORT);
}

describe('account', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const basicApi = connection.contract.Basic;

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

  describe('Set account information', () => {
    describe('/setUserName', () => {
      it(
        'should set username',
        async () => {
          expect.assertions(1);

          const username = 'a1300';
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const response = await basicApi.setUserName(username, secret);
          expect(response).toHaveProperty('transactionId');
        },
        lib.oneMinute
      );
    });

    describe('/lockAccount', () => {
      it(
        'should lock account',
        async () => {
          expect.assertions(1);

          const height = '173000';
          const amount = String(30 * 1e8);
          const secret =
            'summer produce nation depth home scheme trade pitch marble season crumble autumn';
          const username = 'a1300';

          // set username
          await basicApi.setUserName(username, secret);
          await lib.onNewBlock(GNY_PORT);

          const response = await basicApi.lockAccount(height, amount, secret);
          expect(response).toHaveProperty('transactionId');
        },
        lib.oneMinute
      );
    });
  });

  describe('/registerDelegate', () => {
    it(
      'should get forging status',
      async () => {
        expect.assertions(1);

        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        const username = 'a1300';
        const height = '183000';
        const amount = String(30 * 1e8);

        // set username
        await basicApi.setUserName(username, secret);
        await lib.onNewBlock(GNY_PORT);

        // lock account
        await basicApi.lockAccount(height, amount, secret);
        await lib.onNewBlock(GNY_PORT);

        const response = await basicApi.registerDelegate(secret);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });

  describe('/registerDelegate', () => {
    it(
      'should get forging status',
      async () => {
        expect.assertions(1);

        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        const username = 'a1300';
        const height = '183000';
        const amount = String(30 * 1e8);

        // set username
        await basicApi.setUserName(username, secret);
        await lib.onNewBlock(GNY_PORT);

        // lock account
        await basicApi.lockAccount(height, amount, secret);
        await lib.onNewBlock(GNY_PORT);

        const response = await basicApi.registerDelegate(secret);
        expect(response).toHaveProperty('transactionId');
      },
      lib.oneMinute
    );
  });

  describe('/vote', () => {
    async function vote(keyList: string[], secret: string) {
      // lock the account
      await basicApi.lockAccount('173000', String(30 * 1e8), genesisSecret);
      await lib.onNewBlock(GNY_PORT);

      // vote
      const response = await basicApi.vote(keyList, secret);
      expect(response).toHaveProperty('transactionId');
    }

    it(
      'should vote by key list',
      async () => {
        expect.assertions(1);

        await prepareDelegates([
          'change fire praise liar size soon double tissue image drama ribbon winter',
        ]);

        const keyList = ['gny_d1'];
        await vote(keyList, genesisSecret);
      },
      2 * lib.oneMinute
    );

    it(
      'should be able to vote for two or more delegates',
      async () => {
        expect.assertions(1);

        // vote for 2 delegates
        await prepareDelegates([
          'census make riot edit rib plug hungry lift hockey system push regret',
          'grab prize sphere pact video submit cook heavy burden faint belt memory',
        ]);

        const keyList = ['gny_d100', 'gny_d101'];

        await vote(keyList, genesisSecret);
      },
      2 * lib.oneMinute
    );
  });

  describe('/unvote', () => {
    async function voteThenUnvote(keyList: string[], secret) {
      // lock the account
      await basicApi.lockAccount(
        String(173000),
        String(30 * 1e8),
        genesisSecret
      );
      await lib.onNewBlock(GNY_PORT);

      // vote
      await basicApi.vote(keyList, secret);
      await lib.onNewBlock(GNY_PORT);

      // unvote
      const response = await basicApi.unvote(keyList, secret);
      expect(response).toHaveProperty('transactionId');
    }

    it(
      'should unvote by key list',
      async () => {
        expect.assertions(1);

        // prepare gny_d1
        await prepareDelegates([
          'change fire praise liar size soon double tissue image drama ribbon winter',
        ]);

        const keyList = ['gny_d1'];
        await voteThenUnvote(keyList, genesisSecret);
      },
      2 * lib.oneMinute
    );

    it(
      'should be able to unvote multiple delegates',
      async () => {
        expect.assertions(1);

        // prepare gny_d100 and gnyd_101
        await prepareDelegates([
          'census make riot edit rib plug hungry lift hockey system push regret',
          'grab prize sphere pact video submit cook heavy burden faint belt memory',
        ]);

        const keyList = ['gny_d100', 'gny_d101'];
        await voteThenUnvote(keyList, genesisSecret);
      },
      lib.oneMinute
    );
  });
});
