import * as lib from './lib';
import BigNumber from 'bignumber.js';
import axios from 'axios';

const DOCKER_COMPOSE_P2P =
  'config/e2e/two-different-networks/docker-compose.two-different-networks.yml';

describe('two-different-networks', () => {
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
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'two-different-networks');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
    done();
  }, lib.oneMinute);

  it(
    'two-different-networks',
    async done => {
      // two nodes, each with 101 forging secrets and two different
      // genesis Blocks

      await lib.sleep(15 * 1000);

      // both blockchains forge
      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      expect(new BigNumber(height1).isGreaterThan(0)).toEqual(true);
      expect(new BigNumber(height2).isGreaterThan(0)).toEqual(true);

      // // both should have no open connections
      const { data: con1 } = await axios.get(
        'http://localhost:4096/api/peers/connections'
      );
      const { data: con2 } = await axios.get(
        'http://localhost:4098/api/peers/connections'
      );

      expect(Array.isArray(con1)).toBe(true);
      expect(con1).toHaveLength(0);

      expect(Array.isArray(con2)).toBe(true);
      expect(con2).toHaveLength(0);

      done();
    },
    2 * lib.oneMinute
  );
});
