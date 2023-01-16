import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/network-stuck/docker-compose.network-stuck.yml';

describe('network-stuck e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes + 2000);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100, 4102]);
    await lib.sleep(10 * 1000);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute * 1.5);

  afterEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'network-stuck');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    'network-stuck',
    async () => {
      // sleep for 100 seconds (let the network get some traction)
      await lib.sleep(30 * 1000);

      await lib.onNewBlock(4096);
      await lib.sleep(2000);

      // all nodes should have the same height
      await helpers.allHeightsAreTheSame([4096, 4098, 4100, 4102]);

      // now block height should be greater than 6
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThanOrEqualTo(2)).toEqual(true);

      // stop node3 and node4 (now network has not enough votes for block generation)
      consoleLog('stopping... "node3", "node4"');
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['node3', 'node4']);
      consoleLog('stopped: "node3", "node4"');

      consoleLog('removing... "node3", "node4"');
      await lib.rmP2PContainers(DOCKER_COMPOSE_P2P, ['node3', 'node4']);
      consoleLog('removed: "node3", "node4"');

      await lib.sleep(lib.oneMinute / 2);

      // start node3 and node4
      await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4100, 4102]);

      consoleLog('wait for block 1');
      await lib.onNewBlock(4096);
      consoleLog('block 1 finished');

      consoleLog('wait for block 2');
      await lib.onNewBlock(4096);
      consoleLog('block 2 finished');

      consoleLog('wait for block 3');
      await lib.onNewBlock(4096);
      consoleLog('block 3 finished');

      await lib.sleep(30 * 1000);

      // get height later
      // all nodes should have the same height
      await lib.onNewBlock(4096);
      await lib.sleep(2000);
      await helpers.allHeightsAreTheSame([4096, 4098, 4100, 4102]);
    },
    6 * lib.oneMinute
  );
});
