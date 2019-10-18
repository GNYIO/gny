/**
 * @jest-environment jsdom
 */
import { Connection } from '../..';
import * as lib from './lib';

describe('system', () => {
  const connection = new Connection();
  const systemApi = connection.api.System;

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

  describe('/getSystemInfo', () => {
    it(
      'should get system information',
      async () => {
        const response = await systemApi.getSystemInfo();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
