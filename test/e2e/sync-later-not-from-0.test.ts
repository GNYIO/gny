import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-later-not-from-0/docker-compose.sync-later-not-from-0.yml';

describe('sync-later-not-from-0 e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
    await lib.sleep(10 * 1000);
  }, lib.oneMinute * 1.2);

  afterEach(async () => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-later-not-from-0');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
  }, lib.oneMinute);

  it(
    'sync-later-not-from-0',
    async () => {
      // start both nodes, (node1 can forge, node2 can't)
      // both nodes get to node ~4
      // stop and kill node1 container (only node, not db)
      // restart node1 container
      // should sync

      await lib.sleep(30 * 1000);

      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      consoleLog(`height1: ${height1} === height2: ${height2}`);

      expect(new BigNumber(height1).isGreaterThan(0)).toEqual(true);
      expect(new BigNumber(height1).isEqualTo(height2)).toEqual(true);

      // start
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, [
        'sync-later-not-from-0',
      ]);
      await lib.rmP2PContainers(DOCKER_COMPOSE_P2P, ['sync-later-not-from-0']);

      await lib.sleep(20 * 1000);

      const higher1 = await lib.getHeight(4096);
      expect(new BigNumber(higher1).isGreaterThan(height1)).toEqual(true);

      // start
      await lib.upP2PContainers(DOCKER_COMPOSE_P2P, ['sync-later-not-from-0']);

      await lib.sleep(30 * 1000);

      // check if both heights are the same
      await helpers.allHeightsAreTheSame([4096, 4098]);
    },
    3 * lib.oneMinute
  );
});
