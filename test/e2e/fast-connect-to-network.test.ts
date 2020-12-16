import * as lib from './lib';
import * as helpers from './helpers';

const DOCKER_COMPOSE_P2P =
  'config/e2e/fast-connect-to-network/docker-compose.fast-connect-to-network.yml';

describe('fast-connect-to-network e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'fast-connect-to-network');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
    done();
  }, lib.oneMinute);

  it(
    'fast-connect-to-network',
    async done => {
      // start a network of node1, node2, node3, node4
      // every node should be connect to everybody
      // node5 connects to node4
      // after 15 seconds node5 should be connected to all nodes

      // first start all databases
      console.log('starting... "db1", "db2", "db3", "db4", "db5"');
      await lib.spawnP2pContainersSingle(DOCKER_COMPOSE_P2P, [
        'jaeger',
        'db1',
        'db2',
        'db3',
        'db4',
        'db5',
      ]);
      console.log('started. "db1", "db2", "db3", "db4", "db5"');
      await lib.sleep(10 * 1000);

      console.log('starting "node1"...');
      await lib.spawnP2pContainersSingle(DOCKER_COMPOSE_P2P, ['node1']);
      await lib.waitForApiToBeReadyReady(4096);
      console.log('started "node1".');

      console.log('starting "node2"...');
      await lib.spawnP2pContainersSingle(DOCKER_COMPOSE_P2P, ['node2']);
      await lib.waitForApiToBeReadyReady(4098);
      console.log('started "node2".');

      console.log('starting "node3"...');
      await lib.spawnP2pContainersSingle(DOCKER_COMPOSE_P2P, ['node3']);
      await lib.waitForApiToBeReadyReady(4100);
      console.log('started "node3".');

      console.log('starting "node4"...');
      await lib.spawnP2pContainersSingle(DOCKER_COMPOSE_P2P, ['node4']);
      await lib.waitForApiToBeReadyReady(4102);
      console.log('started "node4".');

      // wait for 30 seconds
      console.log(
        `[${new Date().toLocaleTimeString()}] waiting for 30 seconds...`
      );
      await lib.sleep(30 * 1000);
      console.log(
        `[${new Date().toLocaleTimeString()}] 30 seconds stopped waiting.`
      );

      // all peers should be connected to each other
      await helpers.hasXAmountOfPeers(4096, 3);
      await helpers.hasXAmountOfPeers(4098, 3);
      await helpers.hasXAmountOfPeers(4100, 3);
      await helpers.hasXAmountOfPeers(4102, 3);

      // start node5
      console.log('starting "node5"...');
      await lib.spawnP2pContainersSingle(DOCKER_COMPOSE_P2P, ['node5']);
      await lib.waitForApiToBeReadyReady(4104);
      console.log('started "node5".');

      // wait for 30 seconds
      await lib.sleep(30 * 1000);

      // now node5 should be connected to all peers
      console.log(`"node5" should have 4 peers...`);
      await helpers.hasXAmountOfPeers(4104, 4);
      console.log(`"node5" has 4 peers`);

      // and all peers should be connected to node5
      await helpers.hasXAmountOfPeers(4096, 4);
      await helpers.hasXAmountOfPeers(4098, 4);
      await helpers.hasXAmountOfPeers(4100, 4);
      await helpers.hasXAmountOfPeers(4102, 4);

      done();
    },
    6 * lib.oneMinute
  );
});
