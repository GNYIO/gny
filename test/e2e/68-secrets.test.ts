import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';

const DOCKER_COMPOSE_P2P =
  'config/e2e/68-secrets/docker-compose.68-secrets.yml';

describe('68-secrets', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, '68-secrets');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    '68-secrets',
    async done => {
      // wait for the network to create some blocks
      await lib.sleep(lib.oneMinute);

      const before1 = await lib.getHeight(4096);
      const before2 = await lib.getHeight(4096);
      expect(new BigNumber(before1).isGreaterThan(1)).toEqual(true);
      expect(new BigNumber(before2).isGreaterThan(1)).toEqual(true);

      // wait again
      await lib.sleep(lib.oneMinute);

      await helpers.allHeightsAreTheSame([4096, 4098]);

      const after1 = await lib.getHeight(4096);
      const after2 = await lib.getHeight(4098);
      expect(new BigNumber(after1).isGreaterThan(before1)).toEqual(true);
      expect(new BigNumber(after2).isGreaterThan(before2)).toEqual(true);

      done();
    },
    3 * lib.oneMinute
  );
});
