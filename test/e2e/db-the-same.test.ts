import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import * as gnyJS from '@gny/client';
import axios from 'axios';
import { Client } from 'pg';

const DOCKER_COMPOSE_P2P =
  'config/e2e/db-the-same/docker-compose.db-the-same.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const usedAddresses: string[] = [];
async function genesisAccountSendToRandomAddress(port: number) {
  const account = lib.createRandomAccount();

  const raw = gnyJS.basic.transfer(
    account.address,
    String(1000 * 1e8),
    null,
    lib.GENESIS.secret
  );
  const fuelTransactionData = {
    transaction: raw,
  };
  await axios.post(
    `http://localhost:${port}/peer/transactions`,
    fuelTransactionData,
    config
  );

  usedAddresses.push(account.address);
}

async function getTrsCount(port: number) {
  const { data } = await axios.get(`http://localhost:${port}/api/transactions`);
  return data.count;
}

describe('db-the-same', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
    done();
  }, lib.oneMinute * 1.5);

  afterEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'db-the-same');
    await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, [
      'db1',
      'db2',
      'node1',
      'node2',
    ]);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
    done();
  }, lib.oneMinute);

  it(
    'db-the-same',
    async done => {
      console.log(
        `[${new Date().toLocaleTimeString()}] STARTED STARTED STARTED...`
      );

      await lib.onNewBlock(4096);
      await lib.onNewBlock(4098);

      const trsCountFirst = await getTrsCount(4096);

      await genesisAccountSendToRandomAddress(4096);
      await genesisAccountSendToRandomAddress(4096);

      await lib.onNewBlock(4096);

      await genesisAccountSendToRandomAddress(4096);
      await genesisAccountSendToRandomAddress(4096);
      await genesisAccountSendToRandomAddress(4096);
      await genesisAccountSendToRandomAddress(4096);

      await lib.onNewBlock(4096);

      const trsCountSecond = await getTrsCount(4096);

      expect(trsCountFirst + 6).toEqual(trsCountSecond);

      console.log(
        `[${new Date().toLocaleTimeString()}] waiting for network to get down...`
      );
      await lib.onNetworkDown(4096);
      await lib.onNetworkDown(4098);
      console.log(`[${new Date().toLocaleTimeString()}] network down`);

      done();
    },
    4 * lib.oneMinute
  );
});
