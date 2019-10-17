import * as lib from './lib';

const DOCKER_COMPOSE_P2P = 'config/e2e/sync-only/docker-compose.sync-only.yml';

describe('double spend attack', () => {
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

  it('sync-only', async done => {}, 2 * lib.oneMinute);
});
