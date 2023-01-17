import * as lib from './lib';
import * as helpers from './helpers';
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-to-stuck-network/docker-compose.sync-to-stuck-network.yml';

describe('sync-to-stuck-network e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100]);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute * 1.2);

  afterEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-to-stuck-network');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    'sync-to-stuck-network',
    async () => {
      await lib.sleep(20 * 1000);

      // start 3 nodes (25 secrets each)
      // let the network get some traction (until height e.g. 5)
      // stop node 3 a few blocks later (only kill node3) -> this node should from block 7

      // test: we have node1 and node2 at height 10
      //       we have node3 at height 7
      //       the network isn't producing blocks
      //       node3 should sync up to height 10 on its own (normally a block starts syncing when he gets a block out of line
      // goal:   all 3 nodes should be at the same height and start to

      await lib.onNewBlock(4096);
      await lib.sleep(500);
      const [before1, before2, before3] = await helpers.allHeightsAreTheSame([
        4096,
        4098,
        4100,
      ]);

      // stop and kill services db3 and node3
      await lib.onNewBlock(4096);
      await lib.sleep(500);
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['db3', 'node3']);
      await lib.rmP2PContainers(DOCKER_COMPOSE_P2P, ['db3', 'node3']);

      // make
      const [stopped1, stopped2] = await helpers.allHeightsAreTheSame([
        4096,
        4098,
      ]);
      await lib.sleep(15 * 1000);
      const [stoppedAfter1, stoppedAfter2] = await helpers.allHeightsAreTheSame(
        [4096, 4098]
      );
      expect(stopped1).toEqual(stoppedAfter1);
      expect(stopped2).toEqual(stoppedAfter2);

      // start services db3 and node3
      consoleLog(
        `[${new Date().toLocaleTimeString()}] starting "db3" and "node3"...`
      );
      await lib.upP2PContainers(DOCKER_COMPOSE_P2P, ['db3', 'node3']);
      await lib.waitForApiToBeReadyReady(4100);
      consoleLog(
        `[${new Date().toLocaleTimeString()}] started "db3" and "node3"!`
      );

      await lib.sleep(40 * 1000);

      /*const [stoppedAfter1, stoppedAfter2] = */ await helpers.allHeightsAreTheSame(
        [4096, 4098, 4100]
      );
    },
    lib.oneMinute * 7
  );
});
