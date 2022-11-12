import * as lib from './lib';
import BigNumber from 'bignumber.js';
import axios from 'axios';

const DOCKER_COMPOSE_P2P =
  'config/e2e/two-genesis-blocks/docker-compose.two-genesis-blocks.yml';

describe('two-genesis-blocks', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096, 4098]);
  }, lib.oneMinute);

  afterEach(async () => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'two-genesis-blocks');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
  }, lib.oneMinute);

  it(
    'two-genesis-blocks',
    async () => {
      // two nodes, each with 101 forging secrets and two different
      // genesis Blocks

      // both should have no peers
      // both should forge
      // both should have different genesisBlocks
      await lib.sleep(10 * 1000);

      // both should have no peers
      const { data: peers1 } = await axios.get(
        'http://localhost:4096/api/peers'
      );
      const { data: peers2 } = await axios.get(
        'http://localhost:4098/api/peers'
      );
      expect(peers1.peers).toHaveLength(0);
      expect(peers2.peers).toHaveLength(0);

      // both blockchains forge
      const height1 = await lib.getHeight(4096);
      const height2 = await lib.getHeight(4098);
      expect(new BigNumber(height1).isGreaterThan(1)).toEqual(true);
      expect(new BigNumber(height2).isGreaterThan(1)).toEqual(true);

      // both should have different genesisBlocks
      const { data: genesisBlock1 } = await axios.get(
        'http://localhost:4096/api/blocks/getBlock?height=0'
      );
      const { data: genesisBlock2 } = await axios.get(
        'http://localhost:4098/api/blocks/getBlock?height=0'
      );
      expect(genesisBlock1.block.id).not.toBeNull();
      expect(genesisBlock2.block.id).not.toBeNull();
      expect(genesisBlock1.block.id).not.toEqual(genesisBlock2.block.id);
    },
    2 * lib.oneMinute
  );
});
