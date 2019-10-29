import * as lib from './lib';
import BigNumber from 'bignumber.js';

const DOCKER_COMPOSE_P2P = 'config/e2e/sync-only/docker-compose.sync-only.yml';

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

describe('sync only e2e test', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'sync-only',
    async done => {
      await lib.sleep(10 * 1000);
      const first = await bothHeightsAreTheSame([4096, 4098]);

      await lib.sleep(lib.thirtySeconds);
      const second = await bothHeightsAreTheSame([4096, 4098]);

      expect(new BigNumber(first[0]).isLessThan(second[0])).toEqual(true);
      expect(new BigNumber(first[1]).isLessThan(second[1])).toEqual(true);

      done();
    },
    2 * lib.oneMinute
  );
});
