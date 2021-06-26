/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from './lib';

const GNY_PORT = 9096;
const GNY_APP_NAME = 'app6';
const NETWORK_PREFIX = '172.25';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

describe('peer', () => {
  const connection = new Connection('127.0.0.1', GNY_PORT, 'localnet', false);
  const peerApi = connection.api.Peer;

  beforeAll(async done => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();

    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
    done();
  }, lib.oneMinute);

  describe('/getPeers', () => {
    it(
      'should get peers',
      async () => {
        const response = await peerApi.getPeers();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getVersion', () => {
    it(
      'should get version',
      async () => {
        const response = await peerApi.getVersion();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getInfo', () => {
    it(
      'should get info',
      async () => {
        const response = await peerApi.getInfo();
        expect(response.success).toEqual(true);
      },
      lib.oneMinute
    );
  });
});
