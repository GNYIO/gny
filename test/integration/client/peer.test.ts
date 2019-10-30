/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from '../lib';

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
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getVersion', () => {
    it(
      'should get version',
      async () => {
        const response = await peerApi.getVersion();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
