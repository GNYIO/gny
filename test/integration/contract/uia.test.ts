import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';
import { generateAddress } from '../../../src/utils/address';
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

async function beforeUiaTransfer() {
  // prepare registerIssuer
  const registerIssuer = gnyJS.uia.registerIssuer(
    'ABC',
    'some desc',
    genesisSecret
  );
  const registerIssuerTransData = {
    transaction: registerIssuer,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    registerIssuerTransData,
    config
  );
  await lib.onNewBlock();

  // prepare registerAsset
  const registerAsset = gnyJS.uia.registerAsset(
    'BBB',
    'some desc',
    String(10 * 1e8),
    8,
    genesisSecret
  );
  const registerAssetTransData = {
    transaction: registerAsset,
  };
  await axios.post(
    'http://localhost:4096/peer/transactions',
    registerAssetTransData,
    config
  );
  await lib.onNewBlock();

  // prepare issue
  const issue = gnyJS.uia.issue('ABC.BBB', String(10 * 1e8), genesisSecret);
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

  // describe('registerIssuer', () => {
  //   it(
  //     'should regitster an issuer',
  //     async () => {
  //       const issuerName = 'liang';

  //       // Before registering
  //       const beforeRegisterPromise = axios.get(
  //         'http://localhost:4096/api/uia/issuers/' + issuerName
  //       );
  //       expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
  //         success: false,
  //         error: 'Issuer not found',
  //       });
  //       await lib.onNewBlock();

  //       const trs = gnyJS.uia.registerIssuer('liang', 'liang', genesisSecret);
  //       const transData = {
  //         transaction: trs,
  //       };

  //       const { data } = await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         transData,
  //         config
  //       );

  //       expect(data).toHaveProperty('success', true);
  //       expect(data).toHaveProperty('transactionId');
  //       await lib.onNewBlock();

  //       // After registering
  //       const afterTrs = await axios.get(
  //         'http://localhost:4096/api/uia/issuers/' + issuerName
  //       );
  //       expect(afterTrs.data.issuer.name).toBe(issuerName);
  //     },
  //     lib.oneMinute
  //   );
  // });

  // describe('registerAsset', () => {
  //   it(
  //     'should register the asset',
  //     async () => {
  //       const name = 'liang.BBB';
  //       // Before registering asset
  //       const beforeRegisterPromise = axios.get(
  //         'http://localhost:4096/api/uia/assets/' + name
  //       );
  //       expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
  //         success: false,
  //         error: 'Asset not found',
  //       });
  //       await lib.onNewBlock();

  //       const issuerTrs = gnyJS.uia.registerIssuer(
  //         'liang',
  //         'liang',
  //         genesisSecret
  //       );
  //       const issuerTransData = {
  //         transaction: issuerTrs,
  //       };

  //       await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         issuerTransData,
  //         config
  //       );

  //       await lib.onNewBlock();

  //       const trs = gnyJS.uia.registerAsset(
  //         'BBB',
  //         'some description',
  //         String(10 * 1e8),
  //         8,
  //         genesisSecret
  //       );
  //       const transData = {
  //         transaction: trs,
  //       };

  //       const { data } = await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         transData,
  //         config
  //       );

  //       expect(data).toHaveProperty('success', true);
  //       expect(data).toHaveProperty('transactionId');

  //       await lib.onNewBlock();

  //       // After registering
  //       const afterTrs = await axios.get(
  //         'http://localhost:4096/api/uia/assets/' + name
  //       );
  //       expect(afterTrs.data.asset.name).toBe(name);
  //     },
  //     lib.oneMinute
  //   );
  // });

  // describe('issue', () => {
  //   it(
  //     'should update asset',
  //     async () => {
  //       const issuerTrs = gnyJS.uia.registerIssuer(
  //         'liang',
  //         'liang',
  //         genesisSecret
  //       );
  //       const issuerTransData = {
  //         transaction: issuerTrs,
  //       };

  //       await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         issuerTransData,
  //         config
  //       );
  //       await lib.onNewBlock();
  //       const assetTrs = gnyJS.uia.registerAsset(
  //         'BBB',
  //         'some description',
  //         String(10 * 1e8),
  //         8,
  //         genesisSecret
  //       );
  //       const assetTransData = {
  //         transaction: assetTrs,
  //       };

  //       await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         assetTransData,
  //         config
  //       );
  //       await lib.onNewBlock();

  //       // before issue
  //       const issuerName = 'liang';
  //       const beforeIssue = await axios.get(
  //         'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
  //       );
  //       expect(beforeIssue.data.assets[0].quantity).toBe('0');
  //       await lib.onNewBlock();

  //       // issue
  //       const trs = gnyJS.uia.issue(
  //         'liang.BBB',
  //         String(10 * 1e8),
  //         genesisSecret
  //       );
  //       const transData = {
  //         transaction: trs,
  //       };

  //       const { data } = await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         transData,
  //         config
  //       );

  //       expect(data).toHaveProperty('success', true);
  //       expect(data).toHaveProperty('transactionId');

  //       await lib.onNewBlock();

  //       // After issue
  //       const afterIssue = await axios.get(
  //         'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
  //       );
  //       expect(afterIssue.data.assets[0].quantity).toBe(String(10 * 1e8));
  //     },
  //     lib.oneMinute
  //   );
  // });

  describe('transfer', () => {
    it(
      'should transfer some amount to the recipient',
      async done => {
        // prepare
        await beforeUiaTransfer();

        // before transfering
        const recipient = randomAddress();
        const beforeTransfer = await axios.get(
          'http://localhost:4096/api/uia/balances/' + recipient
        );
        expect(beforeTransfer.data.balances).toHaveLength(0);
        await lib.onNewBlock();

        // act
        const transfer = gnyJS.uia.transfer(
          'ABC.BBB',
          String(10 * 1e8),
          recipient,
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: transfer,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // after transfering
        const afterTransfer = await axios.get(
          'http://localhost:4096/api/uia/balances/' + recipient
        );
        expect(afterTransfer.data.balances[0].balance).toBe('1000000000');

        done();
      },
      lib.oneMinute
    );
  });
});
