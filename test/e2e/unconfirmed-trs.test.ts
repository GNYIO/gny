import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import * as gnyClient from '@gny/client';
import { generateAddress } from '@gny/utils';
import * as crypto from 'crypto';
import axios from 'axios';
import * as _ from 'lodash';

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

function createTransactions(count: number) {
  const genesisSecret =
    'grow pencil ten junk bomb right describe trade rich valid tuna service';
  const message = '';
  const amount = 5 * 1e8;

  const transactions = [];

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
    const result = await axios.post(
      'http://localhost:4096/peer/transactions',
      { transaction: one },
      config
    );
    console.log(JSON.stringify(result.data, null, 2));
  }
}

describe('unconfirmed-trs e2e test', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100]);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'unconfirmed-trs',
    async done => {
      // send 3 * 50 transactions to node1
      // node2 and node3 should receive transactions
      await lib.sleep(20 * 1000);

      await helpers.allHeightsAreTheSame([4096, 4098, 4100]);
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThan(2)).toEqual(true);

      let node2Count = 0;
      let node3Count = 3;

      // 1st try
      await sendRandomTransaction(50);
      await lib.sleep(7 * 1000);
      node2Count += await getUnconfirmedTrsCount(4098);
      node3Count += await getUnconfirmedTrsCount(4100);

      // 2nd try
      await sendRandomTransaction(50);
      await lib.sleep(7 * 1000);
      node2Count += await getUnconfirmedTrsCount(4098);
      node3Count += await getUnconfirmedTrsCount(4100);

      // 3rd
      await sendRandomTransaction(50);
      await lib.sleep(7 * 1000);
      node2Count += await getUnconfirmedTrsCount(4098);
      node3Count += await getUnconfirmedTrsCount(4100);

      // node2 and node3 should have got some unconfirmed Transactions
      expect(node2Count).toBeGreaterThan(1);
      expect(node3Count).toBeGreaterThan(1);

      done();
    },
    3 * lib.oneMinute
  );
});
