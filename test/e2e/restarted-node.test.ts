import * as lib from './lib';
import axios from 'axios';
import { BigNumber } from 'bignumber.js';
import { log as consoleLog } from 'console';

const DOCKER_COMPOSE_P2P =
  'config/e2e/restarted-node/docker-compose.restarted-node.yml';

describe('restarted node e2e test', () => {
  beforeAll(async () => {
    await lib.stopAndRemoveOldContainersAndNetworks();
    await lib.buildDockerImage(DOCKER_COMPOSE_P2P);
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096]);
    await lib.sleep(10 * 1000);
  }, lib.oneMinute);

  afterEach(async () => {
    lib.getLogsOfAllServices(DOCKER_COMPOSE_P2P, 'restarted-node');
    await lib.stopAndKillContainer(DOCKER_COMPOSE_P2P);
  }, lib.oneMinute);

  it(
    'restarted node',
    async () => {
      await lib.sleep(30 * 1000);

      const heightBefore = await lib.getHeight(4096);
      expect(new BigNumber(heightBefore).isGreaterThan(2)).toEqual(true);

      // get the lastest block
      const before = await axios.get(
        `http://localhost:${4096}/api/blocks/getBlock?height=${heightBefore}`
      );
      consoleLog(`blockId: ${before.data.block.id}`);

      // restart only the service node1, not the db1 service
      await lib.stopP2PContainers(DOCKER_COMPOSE_P2P, ['node1']);
      await lib.sleep(10 * 1000);
      consoleLog('starting node1 again');
      await lib.spawnP2PContainers(DOCKER_COMPOSE_P2P, [4096]);
      consoleLog('node1 started');
      await lib.sleep(10 * 1000);

      const after = await axios.get(
        `http://localhost:${4096}/api/blocks/getBlock?id=${
          before.data.block.id
        }`
      );
      expect(after.data.block).toEqual(before.data.block);
    },
    2 * lib.oneMinute
  );
});
