import * as lib from './lib';
import * as helpers from './helpers';
import * as gnyJS from '@gny/client';
import axios from 'axios';
import { getConfig } from '@gny/network';

interface IsTrsAvailable {
  transactionId: string;
  port: number;
  isPersisted: boolean;
}

const DOCKER_COMPOSE_P2P =
  'config/e2e/double-spend-attack/docker-compose.double-spend-attack.yml';

const config = {
  headers: {
    magic: getConfig('localnet').hash,
  },
};

async function getGNYBalance(port: number, account: string) {
  const { data } = await axios.get(
    `http://localhost:${port}/api/accounts?address=${account}`
  );
  console.log(`data: ${JSON.stringify(data, null, 2)}`);
  return data.gny as string;
}

async function assertBalanceOnNodes(
  expectedBalance: string,
  account: string,
  ports: number[]
) {
  for (const p of ports) {
    const balance = await getGNYBalance(p, account);
    // TODO add custom error message
    expect(balance).toEqual(expectedBalance);
  }
}

async function getTransactionPersistedData(
  transactionId: string,
  ports: number[]
) {
  const result: IsTrsAvailable[] = [];

  for (const p of ports) {
    const url = `http://localhost:${p}/api/transactions?id=${transactionId}`;
    const { data } = await axios.get(url);
    result.push({
      transactionId: transactionId,
      port: p,
      isPersisted: data.count === 1 ? true : false,
    });
  }

  return result;

  // [
  //   {
  //     transactionId: '568a0b86490177ea105c26...',
  //     port: 4096,
  //     isPersisted: true,
  //   },
  //   {
  //     transactionId: 'fbfe7c968da9552205b88e...',
  //     port: 4098,
  //     isPersisted: true,
  //   }
  // ]
}

/**
 * Either a transaction is persisted on all nodes or not persisted on
 */
async function assertTrsAvailabiltyIsTheSameOnAllNodes(
  ids: string[],
  ports: number[]
) {
  const allTrsAvailableData: IsTrsAvailable[] = [];

  for (const id of ids) {
    const oneTrsAvailableData = await getTransactionPersistedData(id, ports);
    allTrsAvailableData.push(...oneTrsAvailableData);

    // check transaction availibity status
    // transaction availability status should be the same on all nodes
    // good: [true, true]
    // good: [false, false]
    // bad: [true, false]
    const persistedArray: boolean[] = oneTrsAvailableData.map(
      x => x.isPersisted
    );
    expect(helpers.allItemsEqual(persistedArray)).toEqual(true);
  }

  // only two transaction should be persisted
  // example:
  // [
  //   {
  //     "transactionId": "ecf67c0d3d5d3cf6e549fe5de407c70ae0013b3d3b162ae5285818d4a6734bd1",
  //     "port": 4096,
  //     "isPersisted": true
  //   },
  //   {
  //     "transactionId": "ecf67c0d3d5d3cf6e549fe5de407c70ae0013b3d3b162ae5285818d4a6734bd1",
  //     "port": 4098,
  //     "isPersisted": true
  //   },
  //   {
  //     "transactionId": "3f4bc88440fd389b74d89a738b5393c5d5752683f6dd91f993a57661bcf5a936",
  //     "port": 4096,
  //     "isPersisted": false
  //   },
  //   {
  //     "transactionId": "3f4bc88440fd389b74d89a738b5393c5d5752683f6dd91f993a57661bcf5a936",
  //     "port": 4098,
  //     "isPersisted": false
  //   }
  // ]

  console.log(
    `attack-transactions-on-all-nodes:\n${JSON.stringify(
      allTrsAvailableData,
      null,
      2
    )}`
  );
  const persistedArrayAccrossTransactions = allTrsAvailableData
    .map(x => x.isPersisted)
    .filter(x => x === true);
  expect(persistedArrayAccrossTransactions.length).toEqual(2);
}

async function attack(port: number, transaction: any) {
  const trsData = {
    transaction: transaction,
  };
  const attackPromise = await axios.post(
    `http://localhost:${port}/peer/transactions`,
    trsData,
    config
  );
  return attackPromise;
}

describe('double-spend-attack', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute);

  afterEach(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'double-spend-attack');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute * 1.5);

  it(
    'double-spend-attack',
    async () => {
      // setup account_0 (1000 GNY)
      // setup account_1 (0 GNY)
      // create attack_trs_0 (account_0 -> account_1 (1000 GNY))
      // create attack_trs_1 (account_0 -> account_1 (1000 GNY))

      // (simultaneously)
      // send trs0 to node_0
      // send trs1 to node_1

      // wait for 2 blocks
      // only one of (trs_0 or trs_1) should be available from /api/transactions (on both nodes)
      // account_0 should have 0 GNY (on both nodes)
      // account_1 should have 1000 GNY (on both nodes)

      const account_0 = lib.createRandomAccount();
      const account_1 = lib.createRandomAccount();

      await lib.onNewBlock(4096);
      await lib.onNewBlock(4098);

      // transfer 1000.1 GNY from genesis to account_0
      const fuelTransaction_0 = gnyJS.basic.transfer(
        account_0.address,
        String(1000.1 * 1e8),
        undefined,
        // @ts-ignore
        getConfig('localnet').genesis
      );
      const fuelTransaction_0_Data = {
        transaction: fuelTransaction_0,
      };
      // @ts-ignore
      const { data } = await axios.post(
        'http://localhost:4096/peer/transactions',
        fuelTransaction_0_Data,
        config
      );
      await lib.onNewBlock(4096);

      // check balance of account_0 on both nodes
      await assertBalanceOnNodes(String(1000.1 * 1e8), account_0.address, [
        4096,
        4098,
      ]);

      // create first transaction for attack
      const attackTrs_0 = gnyJS.basic.transfer(
        account_1.address,
        String(1000 * 1e8),
        null,
        account_0.secret
      );

      // wait for 1000ms to be sure that the transactionId is different
      await lib.sleep(1000);

      // create second transaction for attack
      const attackTrs_1 = gnyJS.basic.transfer(
        account_1.address,
        String(1000 * 1e8),
        null,
        account_0.secret
      );

      // both attack transaction shouldn't be the same
      expect(attackTrs_0.timestamp).not.toEqual(attackTrs_1.timestamp);

      // send attack_0 to node_0
      // send attack_1 to node_1
      try {
        await Promise.all([
          attack(4096, attackTrs_0),
          attack(4098, attackTrs_1),
        ]);
      } catch (err) {}

      // wait for 2 blocks for the dust to settle
      await lib.onNewBlock(4096);
      await lib.onNewBlock(4098);

      // TODO
      // check if one of the transactions is written to the blockchain

      // check accounts
      await assertBalanceOnNodes(String(0 * 1e8), account_0.address, [
        4096,
        4098,
      ]);
      await assertBalanceOnNodes(String(1000 * 1e8), account_1.address, [
        4096,
        4098,
      ]);

      // check transactions
      await assertTrsAvailabiltyIsTheSameOnAllNodes(
        [attackTrs_0.id as string, attackTrs_1.id as string],
        [4096, 4098]
      );
    },
    2 * lib.oneMinute
  );
});
