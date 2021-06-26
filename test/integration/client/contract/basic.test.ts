/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';

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

describe('account', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const basicApi = connection.contract.Basic;

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

  describe('Set account information', () => {
    describe('/setUserName', () => {
      it(
        'should set username',
        async () => {
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
          const height = 173000;
          const amount = 30 * 1e8;
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
        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        const username = 'a1300';
        const height = 183000;
        const amount = 30 * 1e8;

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
        const secret =
          'summer produce nation depth home scheme trade pitch marble season crumble autumn';

        const username = 'a1300';
        const height = 183000;
        const amount = 30 * 1e8;

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
      await basicApi.lockAccount(173000, 30 * 1e8, genesisSecret);
      await lib.onNewBlock(GNY_PORT);

      // vote
      const response = await basicApi.vote(keyList, secret);
      expect(response).toHaveProperty('transactionId');
    }

    it(
      'should vote by key list',
      async () => {
        const keyList = ['gny_d1'];

        await vote(keyList, genesisSecret);
      },
      lib.oneMinute
    );

    it(
      'should be able to vote for two or more delegates',
      async () => {
        // vote for 2 delegates
        const keyList = ['gny_d100', 'gny_d101'];

        await vote(keyList, genesisSecret);
      },
      lib.oneMinute
    );
  });

  describe('/unvote', () => {
    async function voteThenUnvote(keyList: string[], secret) {
      // set username
      const username = 'xpgeng';
      await basicApi.setUserName(username, genesisSecret);
      await lib.onNewBlock(GNY_PORT);

      // lock the account
      await basicApi.lockAccount(173000, 30 * 1e8, genesisSecret);
      await lib.onNewBlock(GNY_PORT);

      // register delegate
      await basicApi.registerDelegate(genesisSecret);
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
        const keyList = ['gny_d1'];
        await voteThenUnvote(keyList, genesisSecret);
      },
      lib.oneMinute
    );

    it(
      'should be able to unvote multiple delegates',
      async () => {
        const keyList = ['gny_d100', 'gny_d101'];
        await voteThenUnvote(keyList, genesisSecret);
      },
      lib.oneMinute
    );
  });
});
