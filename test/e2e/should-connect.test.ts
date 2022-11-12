import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';

const DOCKER_COMPOSE_P2P =
  'config/e2e/should-connect/docker-compose.should-connect.yml';

describe('should connect e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096]);
    await lib.sleep(10 * 1000);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute * 1.3);

  afterEach(async () => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'should-connect');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute * 1.5);

  it(
    'should connect',
    async () => {
      // two nodes (node1, node2)
      // should automatically connect when started at the same time
      await lib.sleep(30 * 1000);

      const heightBefore = await lib.getHeight(4096);
      expect(new BigNumber(heightBefore).isGreaterThan(1)).toEqual(true);

      await helpers.allHeightsAreTheSame([4096, 4098]);
    },
    2 * lib.oneMinute
  );
});
