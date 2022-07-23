import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import * as gnyClient from '@gny/client';
import axios from 'axios';
import * as _ from 'lodash';
import { getConfig } from '@gny/network';
import { UnconfirmedTransaction } from '@gny/interfaces';

const DOCKER_COMPOSE_P2P =
  'config/e2e/unconfirmed-trs/docker-compose.unconfirmed-trs.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function getUnconfirmedTrsCount(port: number) {
  const { data } = await axios.get(
    `http://localhost:${port}/api/transactions/unconfirmed`
  );
  const count = data.transactions.length as number;
  console.log(`port [${port}] received "${count}" unconfirmed-trs`);
  return count;
}

async function getUnconfirmedTransactions(port: number) {
  let transactions: UnconfirmedTransaction[] = [];
  try {
    const { data } = await axios.get(
      `http://localhost:${port}/api/transactions/unconfirmed`
    );
    transactions = data.transactions as UnconfirmedTransaction[];
  } catch (err) {}
  return transactions;
}

let continueRequest = true;

async function constantQuery(
  port: number,
  map: Map<string, UnconfirmedTransaction>
) {
  while (continueRequest) {
    const transactions = await getUnconfirmedTransactions(port);
    for (let i = 0; i < transactions.length; ++i) {
      const one = transactions[i];
      const trsId = one.id;
      if (!map.has(trsId)) {
        map.set(trsId, one);
      }
    }
    await lib.sleep(250);
  }
}

function createTransactions(count: number) {
  const genesisSecret = getConfig('localnet').genesis;
  const message = '';
  const amount = 5 * 1e8;

  const transactions: UnconfirmedTransaction[] = [];

  for (let i = 0; i < count; ++i) {
    const recipient = lib.createRandomAddress();
    const trs = gnyClient.basic.transfer(
      recipient,
      String(amount),
      message,
      genesisSecret
    );
    transactions.push(trs);
  }
  return transactions;
}

async function sendRandomTransaction(numberOfTransaction: number) {
  const transactions = createTransactions(numberOfTransaction);
  for (let i = 0; i < transactions.length; ++i) {
    const one = transactions[i];
    try {
      const result = await axios.post(
        'http://localhost:4096/peer/transactions',
        { transaction: one },
        config
      );
    } catch (err) {
      console.log(
        `[trs sending failed] ${err.response ? err.response.data : err.message}`
      );
    }
  }
}

describe('unconfirmed-trs e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100]);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'unconfirmed-trs');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'unconfirmed-trs',
    async done => {
      // send 3 * 50 transactions to node1
      // node2 and node3 should receive transactions
      await lib.sleep(20 * 1000);

      const trs4098 = new Map<string, UnconfirmedTransaction>();
      const trs4098Promise = constantQuery(4098, trs4098);

      const trs4100 = new Map<string, UnconfirmedTransaction>();
      const trs4100Promise = constantQuery(4100, trs4100);

      await helpers.allHeightsAreTheSame([4096, 4098, 4100]);
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThan(1)).toEqual(true);

      // 1st try
      await sendRandomTransaction(50);
      await lib.sleep(7 * 1000);
      console.log(`[1][4098]: "${trs4098.size}"`);
      console.log(`[1][4100]: "${trs4100.size}"`);

      // 2nd try
      await sendRandomTransaction(50);
      await lib.sleep(7 * 1000);
      console.log(`[2][4098]: "${trs4098.size}"`);
      console.log(`[2][4100]: "${trs4100.size}"`);

      // 3rd
      await sendRandomTransaction(50);
      await lib.sleep(7 * 1000);
      console.log(`[3][4098]: "${trs4098.size}"`);
      console.log(`[3][4100]: "${trs4100.size}"`);

      // stop checkinng unconfirmed transactions
      continueRequest = false;
      await trs4098Promise;

      expect(trs4098.size).toBeGreaterThan(0);
      console.log(`final size[4098]: "${trs4098.size}"`);

      expect(trs4100.size).toBeGreaterThan(0);
      console.log(`final size[4100]: "${trs4100.size}"`);

      return done();
    },
    3 * lib.oneMinute
  );
});
