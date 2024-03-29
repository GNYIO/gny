import * as lib from './lib';
import * as helpers from './helpers';
import { BigNumber } from 'bignumber.js';
import axios from 'axios';
import { getConfig } from '@gny/network';
import * as gnyClient from '@gny/client';
import { log as consoleLog } from 'console';

const config = {
  headers: {
    magic: getConfig('localnet').hash,
  },
};

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-later/docker-compose.sync-later.yml';

describe('sync-later e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] starting...`);

    // create **only** network, volumes and all containers, don't start them
    await lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);

    consoleLog(`[${new Date().toLocaleTimeString()}] started.`);
  }, lib.oneMinute);

  afterEach(async () => {
    consoleLog(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-only');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    consoleLog(`[${new Date().toLocaleTimeString()}] stopped.`);
  }, lib.oneMinute);

  it(
    'sync-later',
    async () => {
      // start individually all containers
      consoleLog('starting "jaeger", "db1", "db2", "forger"');
      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, [
        'jaeger.local',
        'db1',
        'db2',
        'forger',
      ]);
      await lib.waitForLoaded(4096);
      consoleLog('successfully started "forger"');

      // send a transaction, so a transaction also gets synced
      const trs = gnyClient.basic.transfer(
        'GGrBMK5LjNFHCjc3bxu6Wfy4fie6',
        String(5 * 1e8),
        null,
        // @ts-ignore
        getConfig('localnet').genesis
      );

      consoleLog('sending transaction...');
      const result = await axios.post(
        'http://localhost:4096/peer/transactions',
        { transaction: trs },
        config
      );
      consoleLog('finished sending.');
      // sleep for 100 seconds
      await lib.sleep(100 * 1000);

      // now block height should be greater than 6
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThanOrEqualTo(6)).toEqual(true);

      // start service "sync-later"
      consoleLog('starting service "sync-later"');
      await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4098]);
      consoleLog('started "sync-later".');

      // wait for 20 seconds
      await lib.sleep(20 * 1000);

      // check if both heights are the same
      await helpers.allHeightsAreTheSame([4096, 4098]);
    },
    3 * lib.oneMinute
  );
});
