import * as lib from './lib';
import * as helpers from './helpers';
import BigNumber from 'bignumber.js';

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-later/docker-compose.sync-later.yml';

describe('sync-later e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    // create **only** network, volumes and all containers, don't start them
    lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-later');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'sync-later',
    async done => {
      // start individually all containers
      // await lib.printActiveContainers();
      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, [
        'db1',
        'db2',
        'forger',
      ]);
      await lib.waitForLoaded(4096);

      // sleep for 100 seconds
      await lib.sleep(100 * 1000);

      // now block height should be greater than 6
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThanOrEqualTo(6)).toEqual(true);

      // start service "sync-later"
      lib.startP2PContainers(DOCKER_COMPOSE_P2P, ['sync-later']);

      // wait for 20 seconds
      await lib.sleep(20 * 1000);

      // check if both heights are the same
      await helpers.allHeightsAreTheSame([4096, 4098]);

      // now
      done();
    },
    3 * lib.oneMinute
  );
});
