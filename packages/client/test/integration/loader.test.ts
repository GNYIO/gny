/**
 * @jest-environment jsdom
 */
import { Connection } from '../..';
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
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/syncStatus', () => {
    it(
      'should sync status',
      async () => {
        const response = await loaderApi.syncStatus();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
