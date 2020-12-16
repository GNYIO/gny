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
  'config/e2e/sync-later/docker-compose.sync-later.yml';

describe('sync-later e2e test', () => {
  beforeAll(async done => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] starting...`);

    // create **only** network, volumes and all containers, don't start them
    lib.createP2PContainersOnlyNoStarting(DOCKER_COMPOSE_P2P);
    await lib.sleep(10 * 1000);

    console.log(`[${new Date().toLocaleTimeString()}] started.`);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    console.log(`[${new Date().toLocaleTimeString()}] stopping...`);

    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'sync-only');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);

    console.log(`[${new Date().toLocaleTimeString()}] stopped.`);
    done();
  }, lib.oneMinute);

  it(
    'sync-later',
    async done => {
      // start individually all containers
      console.log('starting "jaeger", "db1", "db2", "forger"');
      await lib.startP2PContainers(DOCKER_COMPOSE_P2P, [
        'jaeger',
        'db1',
        'db2',
        'forger',
      ]);
      await lib.waitForLoaded(4096);
      console.log('successfully started "forger"');

      // send a transaction, so a transaction also gets synced
      const trs = {
        type: 0,
        senderId: 'G4GDW6G78sgQdSdVAQUXdm5xPS13t',
        senderPublicKey:
          '575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b',
        timestamp: 38086260,
        message: '',
        args: [500000000, 'GuQr4DM3aiTD36EARqDpbfsEHoNF'],
        fee: '10000000',
        signatures: [
          'a1586ad60bada273c3d2749b1c99d3257f2ca9ce08ba755442d1d64f462f2225a1bf50bd3a59308cab2f7afc6d6e36b6fa5b252b7a128269ed3251f759cd7608',
        ],
        id: '0035632e3fb7c510fa0b7e264e177d6df914ffca9079a5bf6d1e95914d7c5322',
      };

      console.log('sending transaction...');
      const result = await axios.post(
        'http://localhost:4096/peer/transactions',
        { transaction: trs },
        config
      );
      console.log('finished sending.');
      // sleep for 100 seconds
      await lib.sleep(100 * 1000);

      // now block height should be greater than 6
      const height = await lib.getHeight(4096);
      expect(new BigNumber(height).isGreaterThanOrEqualTo(6)).toEqual(true);

      // start service "sync-later"
      console.log('starting service "sync-later"');
      await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4098]);
      console.log('started "sync-later".');

      // wait for 20 seconds
      await lib.sleep(20 * 1000);

      // check if both heights are the same
      await helpers.allHeightsAreTheSame([4096, 4098]);

      // now
      return done();
    },
    3 * lib.oneMinute
  );
});
