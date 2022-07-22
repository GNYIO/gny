/*
preparation:

Run script:
./config/e2e/network-fork-with-transactions/run.sh

This script creates multiple sql files dump_[int].sql files. Take one sql dump
file has a has a transaction saved within this block height. For example the
in the block 8 we have got a transaction. Then we take the dump_8.sql file.

The goal of this test is to proof that block 8 (with the transactions) can be
rolled back and also make the transaction within this block disappear.

Therefore we need the dump_8.sql file and the dump_7.sql file.


Node1 (port 4096) is starting with dump_8.sql
Node2 (port 4098) is starting with dump_7.sql


Now we need to make sure that Node2 is **not** syncing from Node1. Therefore we
create a fork by letting the Node2 mine a few blocks based on dump7.sql



# restore the base backup so we can simulate a network fork:
sudo docker-compose --file config/integration/docker-compose.integration.yml down
sudo docker-compose --file config/integration/docker-compose.integration.yml up --no-start
sudo docker-compose --file config/integration/docker-compose.integration.yml start db1
sleep 10
cat config/e2e/network-fork-with-transactions/dump_7.sql \
  | sudo docker exec -i db1 psql -U postgres
sleep 5
sudo docker-compose --file config/integration/docker-compose.integration.yml up -d
sleep 30


sudo docker stop -t 1 node1
sudo docker rm node1

sudo docker exec -t db1 pg_dumpall -c -U postgres > \
  config/e2e/network-fork-with-transactions/dump_8v2.sql

sudo docker-compose --file config/integration/docker-compose.integration.yml down
*/

import * as lib from './lib';

const DOCKER_COMPOSE_P2P =
  'config/e2e/network-fork-with-transactions/docker-compose.network-fork-with-transactions.yml';

describe('network-fork-with-transactions', () => {
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

    const backupFile1 = 'config/e2e/network-fork-with-transactions/dump_8.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile1, 'db1');

    const backupFile2 =
      'config/e2e/network-fork-with-transactions/dump_8v2.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile2, 'db2');

    // start the rest of the containers
    await lib.spawnP2PContainersHeightZeroAllowed(DOCKER_COMPOSE_P2P, [
      4096,
      4098,
    ]);

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
    'network-fork-with-transactions',
    async done => {
      console.log(
        `[${new Date().toLocaleTimeString()}] STARTED STARTED STARTED...`
      );

      await lib.sleep(10 * 1000);

      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      console.log(`height1: ${height1}`);
      console.log(`height2: ${height2}`);

      return done();
    },
    5 * lib.oneMinute
  );
});
