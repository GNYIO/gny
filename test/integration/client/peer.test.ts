/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from './lib';

describe('peer', () => {
  const connection = new Connection();
  const peerApi = connection.api.Peer;

  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();

    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
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
