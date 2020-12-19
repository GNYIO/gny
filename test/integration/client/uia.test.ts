/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';
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

async function transferUiaTo(recipient: string) {
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
}

describe('uia', () => {
  const connection = new gnyClient.Connection();
  const uiaApi = connection.api.Uia;
  const contractUiaApi = connection.contract.Uia;

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
        expect(response.success).toBeTruthy();
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
        expect(response.success).toBeTruthy();
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
        expect(response.success).toBeTruthy();
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
        expect(response.success).toBeTruthy();
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
        expect(response.success).toBeTruthy();
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
        expect(response.success).toBeTruthy();
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
        await beforeUiaTransfer(contractUiaApi);

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
        expect(response.success).toBeTruthy();
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
        await beforeUiaTransfer(contractUiaApi);

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
        expect(response.success).toBeTruthy();
      },
      lib.oneMinute
    );
  });

  describe('/getHolders', () => {
    it(
      'should get balance',
      async () => {
        const recipient = 'GTtysDoaWGKMt9Ax6iuscs1eoHeJ';
        await beforeUiaTransfer(contractUiaApi);
        await transferUiaTo(recipient);

        const data = await uiaApi.getHolders('ABC.BBB');
        console.log(`result: ${JSON.stringify(data, null, 2)}`);

        expect(data.success).toEqual(true);
        expect(data.count).toEqual(2);
        expect(data.holders).toHaveLength(2);

        const first = data.holders[0];
        expect(first.address).toEqual('GTtysDoaWGKMt9Ax6iuscs1eoHeJ');
        expect(first.balance).toEqual(String(1000000000));
        expect(first.currency).toEqual('ABC.BBB');

        const second = data.holders[1];
        expect(second.address).toEqual('G4GDW6G78sgQdSdVAQUXdm5xPS13t');
        expect(second.balance).toEqual(String(0));
        expect(second.currency).toEqual('ABC.BBB');
      },
      1.5 * lib.oneMinute
    );

    it(
      'works with offset 1',
      async () => {
        const recipient = 'GTtysDoaWGKMt9Ax6iuscs1eoHeJ';
        await beforeUiaTransfer(contractUiaApi);
        await transferUiaTo(recipient);

        const data = await uiaApi.getHolders('ABC.BBB', 100, 1);
        console.log(`result: ${JSON.stringify(data, null, 2)}`);

        expect(data.success).toEqual(true);
        expect(data.count).toEqual(2);
        expect(data.holders).toHaveLength(1); // important

        const first = data.holders[0];
        expect(first.address).toEqual('G4GDW6G78sgQdSdVAQUXdm5xPS13t');
        expect(first.balance).toEqual(String(0));
        expect(first.currency).toEqual('ABC.BBB');
      },
      1.5 * lib.oneMinute
    );

    it(
      'works with limit 1',
      async () => {
        const recipient = 'GTtysDoaWGKMt9Ax6iuscs1eoHeJ';
        await beforeUiaTransfer(contractUiaApi);
        await transferUiaTo(recipient);

        const data = await uiaApi.getHolders('ABC.BBB', 1, 0);
        console.log(`result: ${JSON.stringify(data, null, 2)}`);

        expect(data.success).toEqual(true);
        expect(data.count).toEqual(2);
        expect(data.holders).toHaveLength(1); // important

        const first = data.holders[0];

        expect(first.address).toEqual('GTtysDoaWGKMt9Ax6iuscs1eoHeJ');
        expect(first.balance).toEqual(String(1000000000));
        expect(first.currency).toEqual('ABC.BBB');
      },
      1.5 * lib.oneMinute
    );
  });
});
