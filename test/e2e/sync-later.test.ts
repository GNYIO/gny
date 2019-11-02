import * as lib from './lib';
import BigNumber from 'bignumber.js';

const DOCKER_COMPOSE_P2P =
  'config/e2e/sync-later/docker-compose.sync-later.yml';

function allItemsEqual(arr: any[]) {
  return new Set(arr).size == 1;
}

async function bothHeightsAreTheSame(ports: number[] = []) {
  const promises = ports.map(x => lib.getHeight(x));
  const result = await Promise.all(promises);

  console.log(`bothHeightsAreTheSame: ${JSON.stringify(result)}`);
  const areAllHeightsTheSame = allItemsEqual(result);
  expect(areAllHeightsTheSame).toEqual(true);

  return result;
}

describe('sync-later e2e test', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
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
      await bothHeightsAreTheSame([4096, 4098]);

      // now
      done();
    },
    3 * lib.oneMinute
  );
});
