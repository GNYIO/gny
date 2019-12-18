import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';

const DOCKER_COMPOSE_P2P =
  'config/e2e/should-connect/docker-compose.should-connect.yml';

describe('should connect e2e test', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096]);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'should connect',
    async done => {
      // two nodes (node1, node2)
      // should automatically connect when started at the same time
      await lib.sleep(30 * 1000);

      const heightBefore = await lib.getHeight(4096);
      expect(new BigNumber(heightBefore).isGreaterThan(1)).toEqual(true);

      await helpers.allHeightsAreTheSame([4096, 4098]);

      done();
    },
    2 * lib.oneMinute
  );
});
