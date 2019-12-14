import * as lib from './lib';
import axios from 'axios';

const DOCKER_COMPOSE_P2P =
  'config/e2e/bootstrap-nodes/docker-compose.bootstrap-nodes.yml';

describe('bootstrap-nodes e2e test', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098, 4100, 4102]);
    await lib.sleep(10 * 1000);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'bootstrap-nodes',
    async done => {
      // node1, node2 and node3 have no forging secrets
      // after 10 seconds node3 should have 2 peers
      await lib.sleep(10 * 1000);

      const node3Port = 4100;
      const result = await axios.get(`http://localhost:${node3Port}/api/peers`);
      console.log(JSON.stringify(result.data, null, 2));
      expect(result.data.peers).toHaveLength(2);

      done();
    },
    1 * lib.oneMinute
  );
});
