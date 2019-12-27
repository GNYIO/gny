import * as lib from './lib';
import axios from 'axios';

const DOCKER_COMPOSE_P2P =
  'config/e2e/bootstrap-nodes/docker-compose.bootstrap-nodes.yml';

describe('bootstrap-nodes e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'bootstrap-nodes');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'bootstrap-nodes',
    async done => {
      // node1, node2 and node3 have no forging secrets
      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, [
        'db1',
        'db2',
        'db3',
        'node1',
        'node2',
        'node3',
      ]);
      await lib.waitForApiToBeReadyReady(4096);
      await lib.waitForApiToBeReadyReady(4098);
      await lib.waitForApiToBeReadyReady(4100);

      // after 10 seconds node3 should have 2 peers
      await lib.sleep(10 * 1000);

      const node1Port = 4096;
      const { data: data1 } = await axios.get(
        `http://localhost:${node1Port}/api/peers`
      );
      expect(data1.peers.length).toEqual(2);

      const node2Port = 4098;
      const { data: data2 } = await axios.get(
        `http://localhost:${node2Port}/api/peers`
      );
      expect(data2.peers.length).toEqual(2);

      const node3Port = 4100;
      const { data: data3 } = await axios.get(
        `http://localhost:${node3Port}/api/peers`
      );
      expect(data3.peers.length).toEqual(2);

      done();
    },
    70 * 1000
  );
});
