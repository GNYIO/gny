import * as gnyClient from '@gny/client';
import * as lib from '../integration/lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('uiaApi', () => {
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

  describe('/issuers', () => {
    it(
      'should return error: "offset" must be a number',
      async () => {
        const limit = 5;
        const offset1 = 0;
        const offset2 = 1;

        // register issuer
        const trs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const issuerPromise = axios.get(
          'http://localhost:4096/api/uia/issuers?limit=' +
            limit +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return error: "limit" must be a number',
      async () => {
        const limit1 = 5;
        const limit2 = 6;
        const offset = 0;

        // register issuer
        const trs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const issuerPromise = axios.get(
          'http://localhost:4096/api/uia/issuers?limit=' +
            limit1 +
            '&limit=' +
            limit2 +
            '&offset=' +
            offset
        );
        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
      },
      lib.oneMinute
    );
  });

  describe('/issuers/:name/assets', () => {
    it(
      'should return error: "offset" must be a number',
      async () => {
        const name = 'liang';
        const limit = 5;
        const offset1 = 0;
        const offset2 = 1;

        // register issuer
        const issuerTrs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const issuerTransData = {
          transaction: issuerTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          issuerTransData,
          config
        );
        await lib.onNewBlock();

        // register assets
        const assetTrs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const assetTransData = {
          transaction: assetTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          assetTransData,
          config
        );
        await lib.onNewBlock();

        const issuerPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' +
            name +
            '/assets?limit=' +
            limit +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return error: "limit" must be a number',
      async () => {
        const name = 'liang';
        const limit1 = 5;
        const limit2 = 6;
        const offset = 0;

        // register issuer
        const issuerTrs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const issuerTransData = {
          transaction: issuerTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          issuerTransData,
          config
        );
        await lib.onNewBlock();

        // register assets
        const assetTrs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const assetTransData = {
          transaction: assetTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          assetTransData,
          config
        );
        await lib.onNewBlock();

        const issuerPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' +
            name +
            '/assets?limit=' +
            limit1 +
            '&limit=' +
            limit2 +
            '&offset=' +
            offset
        );
        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
      },
      lib.oneMinute
    );
  });

  describe('/assets', () => {
    it(
      'should return error: "offset" must be a number',
      async () => {
        const limit = 5;
        const offset1 = 0;
        const offset2 = 1;

        // register issuer
        const issuerTrs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const issuerTransData = {
          transaction: issuerTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          issuerTransData,
          config
        );
        await lib.onNewBlock();

        // register assets
        const assetTrs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const assetTransData = {
          transaction: assetTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          assetTransData,
          config
        );
        await lib.onNewBlock();

        const assetsPromise = axios.get(
          'http://localhost:4096/api/uia/assets?&limit=' +
            limit +
            '&offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(assetsPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "offset" fails because ["offset" must be a number]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return error: "limit" must be a number',
      async () => {
        const limit1 = 5;
        const limit2 = 6;
        const offset = 0;

        // register issuer
        const issuerTrs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const issuerTransData = {
          transaction: issuerTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          issuerTransData,
          config
        );
        await lib.onNewBlock();

        // register assets
        const assetTrs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const assetTransData = {
          transaction: assetTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          assetTransData,
          config
        );
        await lib.onNewBlock();

        const assetsPromise = axios.get(
          'http://localhost:4096/api/uia/assets?&limit=' +
            limit1 +
            '&limit=' +
            limit2 +
            '&offset=' +
            offset
        );
        expect(assetsPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
      },
      lib.oneMinute
    );
  });

  describe('/balances/:address', () => {
    it(
      'should return error: "offset" must be a number',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const offset1 = 1;
        const offset2 = 2;

        const balancePromise = axios.get(
          'http://localhost:4096/api/uia/balances/' +
            address +
            '/?offset=' +
            offset1 +
            '&offset=' +
            offset2
        );
        expect(balancePromise).rejects.toHaveProperty('response.data', {
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

        const balancePromise = axios.get(
          'http://localhost:4096/api/uia/balances/' +
            address +
            '/?limit=' +
            limit1 +
            '&limit=' +
            limit2
        );
        expect(balancePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'child "limit" fails because ["limit" must be a number]',
        });
      },
      lib.oneMinute
    );
  });
});
