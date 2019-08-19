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
      'should get issuers',
      async done => {
        const limit = 5;
        const offset = 0;

        // register issuer
        const trs = gnyJS.uia.registerIssuer('liang', 'liang', genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/issuers?limit=' +
            limit +
            '&offset=' +
            offset
        );
        expect(data.count).toBe(1);

        done();
      },
      lib.oneMinute
    );
  });

  describe('/isIssuer/:address', () => {
    it(
      'should get issuers',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

        // register issuer
        const trs = gnyJS.uia.registerIssuer('liang', 'liang', genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + address
        );
        expect(data.issuer).toHaveProperty('issuerId');
      },
      lib.oneMinute
    );
  });

  describe('/issuers/:name', () => {
    it(
      'should get issuers',
      async () => {
        const name = 'liang';

        // register issuer
        const trs = gnyJS.uia.registerIssuer('liang', 'liang', genesisSecret);
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + name
        );
        expect(data).toHaveProperty('issuer');
      },
      lib.oneMinute
    );
  });

  describe('/issuers/:name/assets', () => {
    it(
      'should get issuers',
      async () => {
        const name = 'liang';
        const limit = 5;
        const offset = 0;

        // register issuer
        const issuerTrs = gnyJS.uia.registerIssuer(
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
        const assetTrs = gnyJS.uia.registerAsset(
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

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/issuers/' +
            name +
            '/assets?limit=' +
            limit +
            '&offset=' +
            offset
        );
        expect(data.count).toBe(1);
      },
      lib.oneMinute
    );
  });

  describe('/assets', () => {
    it(
      'should get issuers',
      async () => {
        const limit = 5;
        const offset = 0;

        // register issuer
        const issuerTrs = gnyJS.uia.registerIssuer(
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
        const assetTrs = gnyJS.uia.registerAsset(
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

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/assets'
        );
        expect(data.count).toBe(1);
      },
      lib.oneMinute
    );
  });

  describe('/assets/:name', () => {
    it(
      'should get issuers',
      async () => {
        const name = 'liang.BBB';

        // register issuer
        const issuerTrs = gnyJS.uia.registerIssuer(
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
        const assetTrs = gnyJS.uia.registerAsset(
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

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(data).toHaveProperty('asset');
      },
      lib.oneMinute
    );
  });

  describe('/balances/:address', () => {
    it(
      'should get issuers',
      async () => {
        const recipient = randomAddress();
        // prepare
        await beforeUiaTransfer();

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
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/balances/' + recipient
        );
        expect(data.balances[0].balance).toBe('1000000000');
      },
      lib.oneMinute
    );
  });

  describe('/balances/:address/:currency', () => {
    it(
      'should get issuers',
      async () => {
        const recipient = randomAddress();
        // prepare
        await beforeUiaTransfer();

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
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/uia/balances/' + recipient + '/ABC.BBB'
        );
        expect(data.balance.balance).toBe('1000000000');
      },
      lib.oneMinute
    );
  });
});
