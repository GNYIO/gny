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
import axios from 'axios';
import { BigNumber } from '@gny/utils';

const DOCKER_COMPOSE_P2P =
  'config/e2e/network-fork/docker-compose.network-fork.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

describe('network-fork', () => {
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

    const backupFile1 = 'config/e2e/network-fork/dump_height_11_node1.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile1, 'db1');

    const backupFile2 = 'config/e2e/network-fork/dump_height_11_node2.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile1, 'db2');

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
    'network-fork',
    async done => {
      console.log(
        `[${new Date().toLocaleTimeString()}] STARTED STARTED STARTED...`
      );

      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      console.log(`height1: ${height1}`);
      console.log(`height2: ${height2}`);

      expect(new BigNumber(height1).isGreaterThan(11)).toEqual(true);
      expect(new BigNumber(height2).isEqualTo(11)).toEqual(true);

      done();
    },
    5 * lib.oneMinute
  );
});
