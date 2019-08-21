import * as gnyJS from '../../packages/gny-js';
import * as lib from './lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

async function registerIssuerAsync(name, desc, secret = genesisSecret) {
  const issuerTrs = gnyJS.uia.registerIssuer(name, desc, secret);
  const issuerTransData = {
    transaction: issuerTrs,
  };

  await axios.post(
    'http://localhost:4096/peer/transactions',
    issuerTransData,
    config
  );
  await lib.onNewBlock();
}

/**
 * Warning: does not wait for new block
 * @param name
 * @param desc
 * @param amount
 * @param precision
 * @param secret
 */
async function registerAssetAsync(
  name,
  desc,
  amount,
  precision,
  secret = genesisSecret
) {
  const assetTrs = gnyJS.uia.registerAsset(
    name,
    desc,
    amount,
    precision,
    secret
  );
  const assetTransData = {
    transaction: assetTrs,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    assetTransData,
    config
  );
}

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

        const promise = axios.get(
          'http://localhost:4096/api/accounts/getBalance/?address=' +
            address +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be a number',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const limit1 = 10;
        const limit2 = 11;

        const promise = axios.get(
          'http://localhost:4096/api/accounts/getBalance/?address=' +
            address +
            '&limit=' +
            limit1 +
            '&limit=' +
            limit2
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
      },
      lib.oneMinute
    );
  });
});
