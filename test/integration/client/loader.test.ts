/**
 * @jest-environment jsdom
 */
import { Connection } from '@gny/client';
import * as lib from './lib';

describe('loader', () => {
  const connection = new Connection();
  const loaderApi = connection.api.Loader;

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

  describe('/getStatus', () => {
    it(
      'should get status',
      async () => {
        const response = await loaderApi.getStatus();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/syncStatus', () => {
    it(
      'should sync status',
      async () => {
        const response = await loaderApi.syncStatus();
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });
});
