import * as lib from './lib';
import * as helpers from './helpers';
import BigNumber from 'bignumber.js';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-later-not-from-0/docker-compose.sync-later-not-from-0.yml';

describe('sync-later-not-from-0 e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-only');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'sync-later',
    async done => {
      // start both nodes, (node1 can forge, node2 can't)
      // both nodes get to node ~4
      // stop and kill node1 container (only node, not db)
      // restart node1 container
      // should sync

      await lib.sleep(30 * 1000);

      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      console.log(`height1: ${height1} === height2: ${height2}`);

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

      // now
      done();
    },
    3 * lib.oneMinute
  );
});
