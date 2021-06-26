/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const GNY_PORT = 6096;
const GNY_APP_NAME = 'app3';
const NETWORK_PREFIX = '172.22';
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

describe('delegate', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet',
    false
  );
  const delegateApi = connection.api.Delegate;

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

  describe('/count', () => {
    it(
      'should count the number of delegate',
      async done => {
        const response = await delegateApi.count();
        expect(response.success).toBeTruthy();
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getVoters', () => {
    it(
      'should get voters by username',
      async done => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          nameTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // lock the account
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          lockTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // register delegate
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          delegateTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // vote
        const trsVote = gnyClient.basic.vote(['xpgeng'], genesisSecret);
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          transVoteData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await delegateApi.getVoters(username);
        expect(response.success).toBeTruthy();
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getOwnVotes', () => {
    it(
      'should get own votes by address',
      async () => {
        // lock the account
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          lockTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // vote
        const trsVote = gnyClient.basic.vote(
          ['gny_d100', 'gny_d101'],
          genesisSecret
        );
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          transVoteData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr'; // genesis address
        const response = await delegateApi.getOwnVotes({ address });
        expect(response.success).toBeTruthy();

        expect(response.delegates).toHaveLength(2);
        const gny_d100 = response.delegates.filter(
          x => x.username === 'gny_d100'
        );
        const gny_d101 = response.delegates.filter(
          x => x.username === 'gny_d101'
        );
        expect(gny_d100).not.toBeUndefined();
        expect(gny_d101).not.toBeUndefined();
      },
      lib.oneMinute
    );
    it(
      'should get own votes by username',
      async () => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          nameTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // lock the account
        const lockTrs = gnyClient.basic.lock(
          String(173000),
          String(30 * 1e8),
          genesisSecret
        );
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          lockTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // vote
        const trsVote = gnyClient.basic.vote(
          ['gny_d1', 'gny_d2', 'gny_d3'],
          genesisSecret
        );
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          transVoteData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await delegateApi.getOwnVotes({ username });
        expect(response.success).toBeTruthy();

        response.success && expect(response.delegates).toHaveLength(3);

        const gny_d1 = response.delegates.filter(x => x.username === 'gny_d1');
        const gny_d2 = response.delegates.filter(x => x.username === 'gny_d2');
        const gny_d3 = response.delegates.filter(x => x.username === 'gny_d3');

        expect(gny_d1).not.toBeUndefined();
        expect(gny_d2).not.toBeUndefined();
        expect(gny_d3).not.toBeUndefined();
      },
      lib.oneMinute
    );
  });

  describe('/getDelegateByUsername', () => {
    it(
      'should get delegate by username',
      async done => {
        // register delegate
        const username = 'xpgeng';

        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          nameTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const trs = gnyClient.basic.registerDelegate(genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          `http://localhost:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await delegateApi.getDelegateByUsername(username);
        expect(response.success).toBeTruthy();
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getDelegates', () => {
    it(
      'should get delegates',
      async () => {
        const offset = '1';
        const limit = '5';

        const response = await delegateApi.getDelegates(offset, limit);
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/forgingStatus', () => {
    it(
      'should get forging status',
      async () => {
        const publicKey =
          '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b';
        const response = await delegateApi.forgingStatus(publicKey);
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/ownProducedBlocks', () => {
    it(
      'get own Produced Blocks',
      async () => {
        await lib.sleep(20 * 1000);

        const blocks = [];
        for (let i = 1; i < 102; ++i) {
          const delegate = `gny_d${i}`;
          console.log(`delegate: ${delegate}`);
          const response = await delegateApi.ownProducedBlocks({
            username: delegate,
          });
          blocks.push(...response.blocks);
        }

        expect(blocks.length).toBeGreaterThan(2);
      },
      lib.oneMinute * 2
    );
  });
});
