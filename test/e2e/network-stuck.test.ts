import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';

const DOCKER_COMPOSE_P2P =
  'config/e2e/network-stuck/docker-compose.network-stuck.yml';

describe('network-stuck e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100, 4102]);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'network-stuck');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'network-stuck',
    async done => {
      // sleep for 100 seconds (let the network get some traction)
      await lib.sleep(100 * 1000);

      // all nodes should have the same height
      await helpers.allHeightsAreTheSame([4096, 4098, 4100, 4102]);

      // now block height should be greater than 6
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThanOrEqualTo(6)).toEqual(true);

      // stop node3 and node4 (now network has not enough votes for block generation)
      console.log('stopping: "node3", "node4"');
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['node3', 'node4']);
      await lib.rmP2PContainers(DOCKER_COMPOSE_P2P, ['node3', 'node4']);

      // wait for 30 seconds
      await lib.sleep(30 * 1000);

      // start node3 and node4
      await lib.upP2PContainers(DOCKER_COMPOSE_P2P, ['node3', 'node4']);

      // get current height
      const currentHeight = await lib.getHeight(4096);

      // sleep for 30 seconds
      await lib.sleep(30 * 1000);

      // get height later
      const heightLater = await lib.getHeight(4096);
      expect(new BigNumber(currentHeight).isLessThan(heightLater)).toEqual(
        true
      );

      done();
    },
    6 * lib.oneMinute
  );
});
