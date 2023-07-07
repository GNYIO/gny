import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/68-secrets/docker-compose.68-secrets.yml';

describe('68-secrets', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute * 1.5);

  afterEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, '68-secrets');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    '68-secrets',
    async () => {
      // wait for the network to create some blocks
      await lib.sleep(lib.oneMinute);

      const before1 = await lib.getHeight(4096);
      const before2 = await lib.getHeight(4096);
      expect(new BigNumber(before1).isGreaterThan(1)).toEqual(true);
      expect(new BigNumber(before2).isGreaterThan(1)).toEqual(true);

      // wait again
      consoleLog(`sleeping for 1 min...`);
      await lib.sleep(lib.oneMinute);
      consoleLog(`stopt sleeping.`);

      await helpers.allHeightsAreTheSame([4096, 4098]);

      const after1 = await lib.getHeight(4096);
      const after2 = await lib.getHeight(4098);
      expect(new BigNumber(after1).isGreaterThan(before1)).toEqual(true);
      expect(new BigNumber(after2).isGreaterThan(before2)).toEqual(true);
    },
    3 * lib.oneMinute
  );
});
