import * as lib from './lib';
import * as gnyJS from '../../packages/gny-js';

const DOCKER_COMPOSE_P2P = 'config/e2e/docker-compose.p2p.yml';

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

  it(
    'attack',
    async done => {
      // setup account_0 (1000 GNY)
      // setup account_1 (0 GNY)
      // create trs_0 (account_0 -> account_1 (1000 GNY))
      // create trs_1 (account_0 -> account_1 (1000 GNY))

      // (simultaneously)
      // send trs0 to node_0
      // send trs1 to node_1

      // wait for 2 blocks
      // only one of (trs_0 or trs_1) should be available from /api/transactions (on both nodes)
      // account_0 should have 0 GNY (on both nodes)
      // account_1 should have 1000 GNY (on both nodes)

      const account_0 = lib.createRandomAddress();
      const account_1 = lib.createRandomAddress();

      await lib.onNewBlock(4098);

      const height_0 = await lib.getHeight(4096);
      console.log(height_0);
      const height_1 = await lib.getHeight(4098);
      console.log(height_1);

      // setup accounts

      done();
    },
    lib.oneMinute
  ); // make two minutes
});
