/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '../..';
import axios from 'axios';
import { generateAddress } from '@gny/utils';
import { randomBytes } from 'crypto';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

function randomAddress() {
  return generateAddress(randomBytes(32).toString('hex'));
}

async function beforeUiaTransfer(uiaApi: any) {
  // prepare registerIssuer
  const name = 'ABC';
  const desc = 'some desc';
  const secret = genesisSecret;

  await uiaApi.registerIssuer(name, desc, secret);
  await lib.onNewBlock();

  // prepare registerAsset
  await uiaApi.registerAsset(
    'BBB',
    'some desc',
    String(10 * 1e8),
    8,
    genesisSecret
  );
  await lib.onNewBlock();

  // prepare issue
  const issue = gnyClient.uia.issue('ABC.BBB', String(10 * 1e8), genesisSecret);
  const issueTransData = {
    transaction: issue,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    issueTransData,
    config
  );
  await lib.onNewBlock();
}

describe('uia', () => {
  const connection = new gnyClient.Connection();
  const uiaApi = connection.api.Uia;

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

  describe('/getIssuers', () => {
    it(
      'should get issuers',
      async done => {
        const limit = 5;
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

        const response = await uiaApi.getIssuers(limit, offset);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/isIssuer', () => {
    it(
      'should check if is an issuer',
      async done => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

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

        const response = await uiaApi.isIssuer(address);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getIssuer', () => {
    it(
      'should get an issuer by username',
      async done => {
        const name = 'liang';

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

        const response = await uiaApi.getIssuer(name);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getIssuerAssets', () => {
    it(
      'should get assets by name',
      async () => {
        const name = 'liang';
        const limit = 5;
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

        const response = await uiaApi.getIssuerAssets(name, limit, offset);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getAssets', () => {
    it(
      'should get assets',
      async () => {
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

        const response = await uiaApi.getAssets();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getAsset', () => {
    it(
      'should get asset by username',
      async () => {
        const name = 'liang.BBB';

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

        const response = await uiaApi.getAsset(name);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getBalances', () => {
    it(
      'should get balances by address',
      async () => {
        const recipient = randomAddress();
        // prepare
        await beforeUiaTransfer(uiaApi);

        // act
        const transfer = gnyClient.uia.transfer(
          'ABC.BBB',
          String(10 * 1e8),
          recipient,
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: transfer,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const response = await uiaApi.getBalances(recipient);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getBalance', () => {
    it(
      'should get balance by address and currency',
      async () => {
        const recipient = randomAddress();
        // prepare
        await beforeUiaTransfer(uiaApi);

        // act
        const transfer = gnyClient.uia.transfer(
          'ABC.BBB',
          String(10 * 1e8),
          recipient,
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: transfer,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const response = await uiaApi.getBalance(recipient, 'ABC.BBB');
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/registerIssuer', () => {
    it(
      'should register issuer',
      async () => {
        const name = 'ABC';
        const desc = 'some desc';
        const secret =
          'grow pencil ten junk bomb right describe trade rich valid tuna service';

        const response = await uiaApi.registerIssuer(name, desc, secret);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/registerAsset', () => {
    it(
      'should register asset',
      async () => {
        const name = 'BBB';
        const desc = 'some desc';
        const maximum = String(10 * 1e8);
        const precision = 8;
        const secret =
          'grow pencil ten junk bomb right describe trade rich valid tuna service';

        // register issuer
        await uiaApi.registerIssuer(name, desc, secret);
        await lib.onNewBlock();

        const response = await uiaApi.registerAsset(
          name,
          desc,
          maximum,
          precision,
          secret
        );
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
