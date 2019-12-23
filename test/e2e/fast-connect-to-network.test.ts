import * as lib from './lib';
import * as helpers from './helpers';

const DOCKER_COMPOSE_P2P =
  'config/e2e/fast-connect-to-network/docker-compose.fast-connect-to-network.yml';

describe('fast-connect-to-network e2e test', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'fast-connect-to-network',
    async done => {
      // start a network of node1, node2, node3, node4
      // every node should be connect to everybody
      // node5 connects node4
      // after 15 seconds node5 should be connected to all nodes

      // first start all databases
      console.log('start: db1, db2, db3, db4, db5');
      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, [
        'db1',
        'db2',
        'db3',
        'db4',
        'db5',
      ]);
      await lib.sleep(10 * 1000);

      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['node1']);
      await lib.waitForApiToBeReadyReady(4096);

      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['node2']);
      await lib.waitForApiToBeReadyReady(4098);

      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['node3']);
      await lib.waitForApiToBeReadyReady(4100);

      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['node4']);
      await lib.waitForApiToBeReadyReady(4102);

      // wait for 30 seconds
      await lib.sleep(30 * 1000);

      // all peers should be connected to each other
      await helpers.hasXAmountOfPeers(4096, 3);
      await helpers.hasXAmountOfPeers(4098, 3);
      await helpers.hasXAmountOfPeers(4100, 3);
      await helpers.hasXAmountOfPeers(4102, 3);

      // start node5
      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['node5']);
      await lib.waitForApiToBeReadyReady(4104);

      // wait for 15 seconds
      await lib.sleep(15 * 1000);

      // now node5 should be connected to all peers
      await helpers.hasXAmountOfPeers(4104, 4);

      // and all peers should be connected to node5
      await helpers.hasXAmountOfPeers(4096, 4);
      await helpers.hasXAmountOfPeers(4098, 4);
      await helpers.hasXAmountOfPeers(4100, 4);
      await helpers.hasXAmountOfPeers(4102, 4);

      done();
    },
    3 * lib.oneMinute
  );
});
