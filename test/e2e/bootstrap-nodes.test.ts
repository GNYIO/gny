import * as lib from './lib';
import axios from 'axios';
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/bootstrap-nodes/docker-compose.bootstrap-nodes.yml';

describe('bootstrap-nodes e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute);

  afterEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'bootstrap-nodes');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    'bootstrap-nodes',
    async () => {
      consoleLog(`[${new Date().toLocaleTimeString()}] up...`);
      // node1, node2 and node3 have no forging secrets
      await lib.upP2PContainers(DOCKER_COMPOSE_P2P, [
        'loki.local',
        'jaeger.local',
        'db1',
        'db2',
        'db3',
        'node1',
        'node2',
        'node3',
      ]);
      consoleLog(`[${new Date().toLocaleTimeString()}] finished up`);
      await lib.waitForApiToBeReadyReady(4096);
      await lib.waitForApiToBeReadyReady(4098);
      await lib.waitForApiToBeReadyReady(4100);

      // after 10 seconds node3 should have 2 peers
      await lib.sleep(30 * 1000);

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
    },
    70 * 1000
  );
});
