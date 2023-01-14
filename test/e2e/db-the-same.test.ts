import * as lib from './lib';
import * as gnyJS from '@gny/client';
import axios from 'axios';
import pkg from 'pg';
const Client = pkg.Client;
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/db-the-same/docker-compose.db-the-same.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function blockCountTheSame() {
  const cmd = 'select count(*) as blockcount from block where height > 0;';
  const result1 = await client1.query(cmd);
  const result2 = await client2.query(cmd);

  consoleLog(
    `---block count the same: "${JSON.stringify(
      result1.rows
    )}" == "${JSON.stringify(result2.rows)}"`
  );

  expect(result1.rows).toEqual(result2.rows);
}

async function accountCountTheSame() {
  const cmd = 'select count(*) as accountcount from account;';
  const result1 = await client1.query(cmd);
  const result2 = await client2.query(cmd);

  consoleLog(
    `---account count the same: "${JSON.stringify(
      result1.rows
    )}" == "${JSON.stringify(result2.rows)}"`
  );

  expect(result1.rows).toEqual(result2.rows);
}

async function transactionCountTheSame() {
  const cmd = 'select count(*) as transactionCount from transaction;';
  const result1 = await client1.query(cmd);
  const result2 = await client2.query(cmd);

  consoleLog(
    `--transaction count the same: "${JSON.stringify(
      result1.rows
    )}" == "${JSON.stringify(result2.rows)}"`
  );

  expect(result1.rows).toEqual(result2.rows);
}

async function transactionFeesAreTheSame() {
  const cmd1 = 'select sum(fee) as transactionfeesum from transaction';
  const trs1 = await client1.query(cmd1);
  const trs2 = await client2.query(cmd1);

  consoleLog(
    `--transaction fee sum is the same: "${JSON.stringify(
      trs1.rows
    )}" == "${JSON.stringify(trs2.rows)}"\n\n`
  );
  expect(trs1.rows).toEqual(trs2.rows);

  const cmd2 = 'select sum(fees) as delegatefees from delegate;';
  const delegate1 = await client1.query(cmd2);
  const delegate2 = await client2.query(cmd2);

  consoleLog(
    `--delegate fee sum are the same: "${JSON.stringify(
      delegate1.rows
    )}" == "${JSON.stringify(delegate2.rows)}"`
  );
  expect(delegate1.rows).toEqual(delegate2.rows);

  // check if its coherent for db1
  const { transactionfeesum: trsfeesum1 } = trs1.rows[0];
  const { delegatefees: delfeessum1 } = delegate1.rows[0];
  expect(trsfeesum1).toEqual(delfeessum1);

  // check if  its coherent for db2
  const { transactionfeesum: trsfeesum2 } = trs2.rows[0];
  const { delegatefees: delfeessum2 } = delegate2.rows[0];
  expect(trsfeesum2).toEqual(delfeessum2);
}

async function compareDelegates() {
  const cmd = `select address, tid, username, "publicKey", votes,
               "producedBlocks", "missedBlocks", fees, rewards, _version_
               from delegate
               order by address asc;`;

  const delegate1 = await client2.query(cmd);
  const delegate2 = await client2.query(cmd);

  expect(delegate1.rows.length).toEqual(delegate2.rows.length);

  for (let i = 0; i < delegate1.rows.length; ++i) {
    const one = delegate1.rows[i];
    const two = delegate2.rows[i];

    consoleLog(
      `--delegates are all the same:\n"${JSON.stringify(
        one,
        null,
        2
      )}" == "${JSON.stringify(two, null, 2)}"`
    );
    expect(one).toEqual(two);
  }
}

async function compareAccounts() {
  const cmd = `select address, username, gny, "publicKey", "secondPublicKey",
               "isDelegate", "isLocked", "lockHeight", "lockAmount", _version_
               from account
               order by address asc;`;

  const account1 = await client1.query(cmd);
  const account2 = await client2.query(cmd);

  expect(account1.rows.length).toEqual(account2.rows.length);

  for (let i = 0; i < account1.rows.length; ++i) {
    const one = account1.rows[i];
    const two = account2.rows[i];

    consoleLog(
      `--accounts are all the same:\n"${JSON.stringify(
        one,
        null,
        2
      )}" == "${JSON.stringify(two, null, 2)}"`
    );
    expect(one).toEqual(two);
  }
}

async function compareProducedBlocks() {
  const cmd = 'select count(*) as producedblockscount from delegate';

  const delegate1 = await client1.query(cmd);
  const delegate2 = await client2.query(cmd);
  consoleLog(
    `--producedblocks:\n"${JSON.stringify(
      delegate1.rows
    )}" == "${JSON.stringify(delegate2.rows)}"`
  );
  expect(delegate1.rows).toEqual(delegate2.rows);

  // block 0 doesn't count
  const cmd2 = 'select count(*) as blockcount from block where height > 0';
  const block1 = await client1.query(cmd2);
  const block2 = await client2.query(cmd2);
  consoleLog(
    `--producedBlocks:\n"${JSON.stringify(block1.rows)}" == "${JSON.stringify(
      block2.rows
    )}"`
  );
  expect(block1.rows).toEqual(block2.rows);

  // TODO check if delegate has produced as much blocks
  // like he has stored in column "producedBlocks"
}

async function checkRound() {
  const cmd =
    'select fee, reward, round, _version_ from round where round = 1;';
  const round1 = await client1.query(cmd);
  const round2 = await client2.query(cmd);
  consoleLog(
    `--rounds:\n"${JSON.stringify(round1.rows)}" == "${JSON.stringify(
      round2.rows
    )}"`
  );
  expect(round1.rows).toEqual(round2.rows);

  // rounds are the same
  const { reward: reward1, fee: fee1 } = round1.rows[0];
  const { reward: reward2, fee: fee2 } = round2.rows[0];

  const cmd2 = 'select sum(fee) as transactionfeesum from transaction';
  const transaction1 = await client1.query(cmd2);
  const transaction2 = await client2.query(cmd2);

  const { transactionfeesum: transfeesum1 } = transaction1.rows[0];
  const { transactionfeesum: transfeesum2 } = transaction2.rows[0];

  expect(fee1).toEqual(transfeesum1);
  expect(fee2).toEqual(transfeesum2);

  const cmd3 = 'select sum(rewards) as delegatereward from delegate;';
  const delegate1 = await client1.query(cmd3);
  const delegate2 = await client2.query(cmd3);
  const { delegatereward: delegatereward1 } = delegate1.rows[0];
  const { delegatereward: delegatereward2 } = delegate2.rows[0];

  expect(reward1).toEqual(delegatereward1);
  expect(reward2).toEqual(delegatereward2);
}

// round

const trsFeeSum = `select sum(fee) as fee from transaction;`;
const delegateFeeSum = `select sum(fees) from delegate`;

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

// postgres connections
let client1: pkg.Client;
let client2: pkg.Client;

describe('db-the-same', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    // restore
    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['db1', 'db2']);
    await lib.sleep(5000);

    const backupFile = 'config/e2e/db-the-same/dump_26-06-2022_13_47_50.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile, 'db1');
    await lib.sleep(5000);

    // start the rest of the containers
    await lib.spawnP2PContainersHeightZeroAllowed(DOCKER_COMPOSE_P2P, [
      4096,
      4098,
    ]);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);

    // spin up clients
    client1 = new Client({
      user: 'postgres',
      host: '172.20.0.2',
      database: 'postgres',
      password: 'docker',
      port: 5432,
    });
    client2 = new Client({
      user: 'postgres',
      host: '172.20.0.4',
      database: 'postgres',
      password: 'docker',
      port: 5432,
    });

    // connect clients
    await client1.connect();
    await client2.connect();
  }, lib.oneMinute * 1.5);

  afterEach(async () => {
    // disconnect clients
    if (client1 !== null) {
      await client1.end();
    }
    if (client2 !== null) {
      await client2.end();
    }

    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'db-the-same');
    await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, [
      'db1',
      'db2',
      'node1',
      'node2',
    ]);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    'db-the-same',
    async () => {
      consoleLog(
        `[${new Date().toLocaleTimeString()}] STARTED STARTED STARTED...`
      );

      // both nodes have no secrets (no forging)
      // restore database for node1 (up to height 101)
      // let node2 sync up to node2

      // stop node1 and node2
      // check db1 and db2. Are they the same??

      // do not wait for a new block, because they are no blocks being produced
      await lib.sleep(lib.oneMinute);

      consoleLog(
        `[${new Date().toLocaleTimeString()}] waiting for network to get down...`
      );
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['node1', 'node2']);
      await lib.onNetworkDown(4096);
      await lib.onNetworkDown(4098);
      consoleLog(`[${new Date().toLocaleTimeString()}] network down`);

      // check
      await compareProducedBlocks();
      await checkRound();

      await blockCountTheSame();
      await accountCountTheSame();
      await transactionCountTheSame();
      await transactionFeesAreTheSame();
      await compareDelegates();
      await compareAccounts();
    },
    5 * lib.oneMinute
  );
});
