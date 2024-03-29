import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';

const DOCKER_COMPOSE_P2P = 'config/e2e/sync-only/docker-compose.sync-only.yml';

describe('sync only e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
  }, lib.oneMinute * 1.2);

  afterEach(async () => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-only');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
  }, lib.oneMinute);

  it(
    'sync-only',
    async () => {
      await lib.sleep(10 * 1000);
      const first = await helpers.allHeightsAreTheSame([4096, 4098]);

      await lib.sleep(lib.thirtySeconds);
      const second = await helpers.allHeightsAreTheSame([4096, 4098]);

      expect(new BigNumber(first[0]).isLessThan(second[0])).toEqual(true);
      expect(new BigNumber(first[1]).isLessThan(second[1])).toEqual(true);
    },
    3 * lib.oneMinute
  );
});
