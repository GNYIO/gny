/*
sudo docker stop node1
sudo docke rm node1

sudo docker exec -t db1  pg_dumpall -c -U postgres > dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql


sudo docker-compose --file config/integration/docker-compose.integration.yml up --no-start
sudo docker-compose --file config/integration/docker-compose.integration.yml start db1


cat dump_height_10.sql | sudo docker exec -i db1 psql -U postgres


####
# Prepare node1; height 0-10 same as node2; height 11 differnt
####

# die nächsten zwei schritte passieren fast parallel
sudo docker-compose --file config/integration/docker-compose.integration.yml up
# im anderen terminal ausführen nachdem nur 1 Block gemintet wurde
sudo docker stop node1 --time 1

# jetzt können
sudo docker exec -t db1  pg_dumpall -c -U postgres > dump_height_11_node1.sql



####
# Prepare node2; height 0-10 same as node1; height 11 differnt
####
sudo docker-compose --file config/integration/docker-compose.integration.yml up --no-start
sudo docker-compose --file config/integration/docker-compose.integration.yml start db1
cat dump_height_10.sql | sudo docker exec -i db1 psql -U postgres

# parallel
sudo docker-compose --file config/integration/docker-compose.integration.yml up
sudo docker stop node1 --time 1

# jetzt können wir ein backup machen
sudo docker exec -t db1  pg_dumpall -c -U postgres > dump_height_11_node2.sql

*/

import * as lib from './lib';
import { BigNumber } from '@gny/utils';

const DOCKER_COMPOSE_P2P =
  'config/e2e/network-fork/docker-compose.network-fork.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('network-fork', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    // restore
    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['db1', 'db2']);
    await lib.sleep(5000);

    const backupFile1 = 'config/e2e/network-fork/dump_height_11_node1.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile1, 'db1');

    const backupFile2 = 'config/e2e/network-fork/dump_height_11_node2.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile2, 'db2');

    // start the rest of the containers
    await lib.spawnP2PContainersHeightZeroAllowed(DOCKER_COMPOSE_P2P, [
      4096,
      4098,
    ]);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute * 1.5);

  afterEach(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'db-the-same');
    await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, [
      'db1',
      'db2',
      'node1',
      'node2',
    ]);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    'network-fork',
    async () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] STARTED STARTED STARTED...`
      );

      await lib.sleep(10 * 1000);

      // confirm that node1 is > height 11
      // confirm that node2 is = height 11
      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      console.log(`height1: ${height1}`);
      console.log(`height2: ${height2}`);

      expect(new BigNumber(height1).isGreaterThan(11)).toEqual(true);
      expect(new BigNumber(height2).isEqualTo(11)).toEqual(true);

      // check height 10
      const node1_block10 = await lib.getBlock(4096, String(10));
      const node2_block10 = await lib.getBlock(4098, String(10));

      console.log(`node1(10): ${JSON.stringify(node1_block10, null, 2)}`);
      console.log(`node2(10): ${JSON.stringify(node2_block10, null, 2)}`);

      expect(node1_block10).toHaveProperty('id');
      expect(node2_block10).toHaveProperty('id');
      // show that block10 are on both nodes the same
      expect(node1_block10.id).toEqual(node2_block10.id);

      // check height 11
      const node1_block11 = await lib.getBlock(4096, String(11));
      const node2_block11 = await lib.getBlock(4098, String(11));

      console.log(`node1(11): ${JSON.stringify(node1_block11, null, 2)}`);
      console.log(`node2(11): ${JSON.stringify(node2_block11, null, 2)}`);

      expect(node1_block11).toHaveProperty('id');
      expect(node2_block11).toHaveProperty('id');
      // show that height 11 are NOT the same on both nodes
      expect(node1_block11.id).not.toEqual(node2_block11.id);

      // sleep for 60 sec
      await lib.sleep(60 * 1000);

      const height = await lib.getHeight(4098);
      const block = await lib.getBlock(4098, height);
      console.log(`node(4098) has height: ${height}`);
      console.log(`node2: ${JSON.stringify(block, null, 2)}`);
      expect(new BigNumber(height).isGreaterThan(11)).toEqual(true);
    },
    5 * lib.oneMinute
  );
});
