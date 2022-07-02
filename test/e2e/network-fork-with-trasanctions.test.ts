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

    const backupFile1 = 'config/e2e/network-fork-with-transactions/dump1.sql';
    await lib.restoreBackup(DOCKER_COMPOSE_P2P, backupFile1, 'db1');

    const backupFile2 = 'config/e2e/network-fork-with-transactions/dump2.sql';
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

      // confirm that node1 is > height 11
      // confirm that node2 is = height 11
      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      console.log(`height1: ${height1}`);
      console.log(`height2: ${height2}`);

      return done();
    },
    5 * lib.oneMinute
  );
});
