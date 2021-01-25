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

async function blockCountTheSame() {
  const cmd = 'select count(*) as blockcount from block;';
  const result1 = await client1.query(cmd);
  const result2 = await client2.query(cmd);

  console.log(
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

  console.log(
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

  console.log(
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

  console.log(
    `--transaction fee sum is the same: "${JSON.stringify(
      trs1.rows
    )}" == "${JSON.stringify(trs2.rows)}"\n\n`
  );
  expect(trs1.rows).toEqual(trs2.rows);

  const cmd2 = 'select sum(fees) as delegatefees from delegate;';
  const delegate1 = await client1.query(cmd2);
  const delegate2 = await client2.query(cmd2);

  console.log(
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

    console.log(
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

    console.log(
      `--accounts are all the same:\n"${JSON.stringify(
        one,
        null,
        2
      )}" == "${JSON.stringify(two, null, 2)}"`
    );
    expect(one).toEqual(two);
  }
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

async function getTrsCount(port: number) {
  const { data } = await axios.get(`http://localhost:${port}/api/transactions`);
  return data.count;
}

// postgres connections
let client1: Client = null;
let client2: Client = null;

describe('db-the-same', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    // restore
    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['db1', 'db2']);
    await lib.sleep(5000);

    const backupFile =
      'config/e2e/db-the-same/gny_height_101_25-01-2021_14_28_33.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile, 'db1');
    await lib.sleep(5000);

    // start the rest of the containers
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);

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

    done();
  }, lib.oneMinute * 1.5);

  afterEach(async done => {
    // disconnect clients
    if (client1 !== null) {
      await client1.end();
    }
    if (client2 !== null) {
      await client2.end();
    }

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

      // both nodes have no secrets (no forging)
      // restore database for node1 (up to height 101)
      // let node2 sync up to node2

      // stop node1 and node2
      // check db1 and db2. Are they the same??

      // do not wait for a new block, because they are no blocks being produced
      await lib.sleep(lib.oneMinute);

      console.log(
        `[${new Date().toLocaleTimeString()}] waiting for network to get down...`
      );
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['node1', 'node2']);
      await lib.onNetworkDown(4096);
      await lib.onNetworkDown(4098);
      console.log(`[${new Date().toLocaleTimeString()}] network down`);

      // check
      await blockCountTheSame();
      await accountCountTheSame();
      await transactionCountTheSame();
      await transactionFeesAreTheSame();
      await compareDelegates();
      await compareAccounts();

      done();
    },
    5 * lib.oneMinute
  );
});
