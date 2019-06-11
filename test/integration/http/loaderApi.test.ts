import * as lib from '../lib';
import axios from 'axios';

describe('loaderApi', () => {
  beforeAll(async done => {
    lib.exitIfNotRoot();

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

  describe('/status', () => {
    it(
      'should get the status',
      async done => {
        const { data } = await axios.get(
          'http://localhost:4096/api/loader/status'
        );
        expect(data).toHaveProperty('loaded');
        expect(data).toHaveProperty('lastBlockHeight');
        expect(data).toHaveProperty('count');
        done();
      },
      lib.oneMinute
    );
  });

  describe('/status/sync', () => {
    it(
      'should get the status about syncing',
      async done => {
        const { data } = await axios.get(
          'http://localhost:4096/api/loader/status/sync'
        );
        expect(data).toHaveProperty('syncing');
        expect(data).toHaveProperty('blocks');
        expect(data).toHaveProperty('height');
        done();
      },
      lib.oneMinute
    );
  });
});
