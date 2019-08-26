import * as lib from './lib';
import axios from 'axios';

describe('accountsApi', () => {
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

  describe('/getBalance', () => {
    it(
      'should return error: "offset" must be a number',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const offset1 = 1;
        const offset2 = 3;

        const accountPromise = axios.get(
          'http://localhost:4096/api/accounts/getBalance/?address=' +
            address +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );

        expect(accountPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
        expect(accountPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be a number',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const limit1 = 10;
        const limit2 = 11;

        const accountPromise = axios.get(
          'http://localhost:4096/api/accounts/getBalance/?address=' +
            address +
            '&limit=' +
            limit1 +
            '&limit=' +
            limit2
        );

        expect(accountPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
        expect(accountPromise).rejects.toHaveProperty('response.status', 422);
      },
      lib.oneMinute
    );
  });
});
