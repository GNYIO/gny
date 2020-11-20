import * as gnyClient from '@gny/client';
import * as lib from '../lib';
import axios from 'axios';
import { generateAddress } from '../../../packages/utils/src/address';
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
  const registerIssuer = gnyClient.uia.registerIssuer(
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
  const registerAsset = gnyClient.uia.registerAsset(
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

async function registerIssuerAsync(name, desc, secret = genesisSecret) {
  const issuerTrs = gnyClient.uia.registerIssuer(name, desc, secret);
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

async function registerAssetAsync(
  name,
  desc,
  amount,
  precision,
  secret = genesisSecret
) {
  const assetTrs = gnyClient.uia.registerAsset(
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

  describe('registerIssuer', () => {
    it(
      'should regitster an issuer',
      async () => {
        const issuerName = 'liang';

        // Before registering
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Issuer not found',
        });
        await lib.onNewBlock();

        // Register
        const trs = gnyClient.uia.registerIssuer(
          'liang',
          'liang',
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');
        await lib.onNewBlock();

        // After registering
        const afterTrs = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(afterTrs.data.issuer.name).toBe(issuerName);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid issuer name',
      async () => {
        const issuerName = '#123abc';

        // Before registering
        const beforeRegister = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(beforeRegister.data.issues).toHaveLength(0);
        await lib.onNewBlock();

        // Register
        const trs = gnyClient.uia.registerIssuer(
          issuerName,
          'liang',
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const issuerPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid issuer name',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: No issuer description was provided',
      async () => {
        const issuerName = 'liang';

        // Before registering
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Issuer not found',
        });
        await lib.onNewBlock();

        // Register
        const description = '';
        const trs = gnyClient.uia.registerIssuer(
          issuerName,
          description,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const issuerPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: No issuer description was provided',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid issuer description',
      async () => {
        const issuerName = 'liang';

        // Before registering
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Issuer not found',
        });
        await lib.onNewBlock();

        // Register
        let description = '';
        for (let i = 0; i < 4097; i++) {
          description += String(i);
        }
        const trs = gnyClient.uia.registerIssuer(
          issuerName,
          description,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const issuerPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid issuer description',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Issuer name already exists',
      async () => {
        const issuerName = 'liang';

        // Before registering
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Issuer not found',
        });
        await lib.onNewBlock();

        // Register first time
        const trs = gnyClient.uia.registerIssuer(
          issuerName,
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

        // Register twice
        const trsTwice = gnyClient.uia.registerIssuer(
          issuerName,
          'liang',
          genesisSecret
        );
        const transTwiceData = {
          transaction: trsTwice,
        };

        const issuerPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Issuer name already exists',
        });
        await lib.onNewBlock();

        // After registering
        const afterTrs = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(afterTrs.data.issuer.name).toBe(issuerName);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Account is already an issuer',
      async () => {
        const issuerName = 'liang';

        // Before registering
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Issuer not found',
        });
        await lib.onNewBlock();

        // Register first time
        const trs = gnyClient.uia.registerIssuer(
          issuerName,
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

        // Register twice
        const trsTwice = gnyClient.uia.registerIssuer(
          'liangpeili',
          'liangpeili',
          genesisSecret
        );
        const transTwiceData = {
          transaction: trsTwice,
        };

        const issuerPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        expect(issuerPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account is already an issuer',
        });
        await lib.onNewBlock();

        // After registering
        const afterTrs = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName
        );
        expect(afterTrs.data.issuer.name).toBe(issuerName);
      },
      lib.oneMinute
    );
  });

  describe('registerAsset', () => {
    it(
      'should register the asset',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // After registering
        const afterTrs = await axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterTrs.data.asset.name).toBe(name);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid symbol',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        const trs = gnyClient.uia.registerAsset(
          'bbb',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const assetPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(assetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid symbol',
        });

        await lib.onNewBlock();

        // After registering
        const afterRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid asset description',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        let description = '';
        for (let i = 0; i < 4097; i++) {
          description += String(i);
        }
        const trs = gnyClient.uia.registerAsset(
          'BBB',
          description,
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const assetPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(assetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid asset description',
        });

        await lib.onNewBlock();

        // After registering
        const afterRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Precision should be positive integer',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          0,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const assetPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(assetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Precision should be positive integer',
        });

        await lib.onNewBlock();

        // After registering
        const afterRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid asset precision',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          32,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const assetPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(assetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid asset precision',
        });

        await lib.onNewBlock();

        // After registering
        const afterRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Account is not an issuer',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        // await registerIssuerAsync('liang', 'liang');

        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const assetPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(assetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Account is not an issuer',
        });

        await lib.onNewBlock();

        // After registering
        const afterRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Asset already exists',
      async () => {
        const name = 'liang.BBB';
        // Before registering asset
        const beforeRegisterPromise = axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(beforeRegisterPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Asset not found',
        });
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        // register once
        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
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

        // register twice
        const trsTwice = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String(10 * 1e8),
          8,
          genesisSecret
        );
        const transTwiceData = {
          transaction: trsTwice,
        };

        const assetPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transTwiceData,
          config
        );

        expect(assetPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Asset already exists',
        });

        await lib.onNewBlock();

        // After registering
        const afterTrs = await axios.get(
          'http://localhost:4096/api/uia/assets/' + name
        );
        expect(afterTrs.data.asset.name).toBe(name);
      },
      lib.oneMinute
    );

    it(
      'maximum of 9000000000000000000 is ok',
      async () => {
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        // register once
        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String('9000000000000000000'),
          8,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const trsPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(trsPromise).resolves.toMatchObject({
          data: {
            success: true,
            transactionId: expect.any(String),
          },
        });
      },
      lib.oneMinute
    );

    it(
      'maximum of 9000000000000000001 will fail',
      async () => {
        await lib.onNewBlock();

        await registerIssuerAsync('liang', 'liang');

        // register once
        const trs = gnyClient.uia.registerAsset(
          'BBB',
          'some description',
          String('9000000000000000001'),
          8,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const trsPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        return expect(trsPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid amount range',
        });
      },
      lib.oneMinute
    );
  });

  describe('issue', () => {
    it(
      'should update asset',
      async () => {
        await registerIssuerAsync('liang', 'liang');
        await registerAssetAsync(
          'BBB',
          'some description',
          String(10 * 1e8),
          8
        );

        // before issue
        const issuerName = 'liang';
        const beforeIssue = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
        );
        expect(beforeIssue.data.assets[0].quantity).toBe('0');
        await lib.onNewBlock();

        // issue
        const trs = gnyClient.uia.issue(
          'liang.BBB',
          String(10 * 1e8),
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const { data } = await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('transactionId');

        await lib.onNewBlock();

        // After issue
        const afterIssue = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
        );
        expect(afterIssue.data.assets[0].quantity).toBe(String(10 * 1e8));
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid currency',
      async () => {
        await registerIssuerAsync('liang', 'liang');
        await registerAssetAsync(
          'BBB',
          'some description',
          String(10 * 1e8),
          8
        );

        // before issue
        const issuerName = 'liang';
        const beforeIssue = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
        );
        expect(beforeIssue.data.assets[0].quantity).toBe('0');
        await lib.onNewBlock();

        // issue
        const trs = gnyClient.uia.issue(
          'liang.bbb',
          String(10 * 1e8),
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const issuePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(issuePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid currency',
        });

        await lib.onNewBlock();

        // After issue
        const afterIssue = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
        );
        expect(afterIssue.data.assets[0].quantity).toBe('0');
      },
      lib.oneMinute
    );

    it(
      'should return the error: Asset not exists',
      async () => {
        await registerIssuerAsync('liang', 'liang');
        // await registerAssetAsync('BBB', 'some description', String(10 * 1e8), 8);

        // issue
        const trs = gnyClient.uia.issue(
          'liang.BBB',
          String(10 * 1e8),
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const issuePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(issuePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Asset not exists',
        });

        await lib.onNewBlock();
      },
      lib.oneMinute
    );

    it.skip('should return the error: Permission denied', async () => {});

    it(
      'should return the error: Exceed issue limit',
      async () => {
        await registerIssuerAsync('liang', 'liang');
        await registerAssetAsync(
          'BBB',
          'some description',
          String(10 * 1e8),
          8
        );

        // before issue
        const issuerName = 'liang';
        const beforeIssue = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
        );
        expect(beforeIssue.data.assets[0].quantity).toBe('0');
        await lib.onNewBlock();

        // issue

        const trs = gnyClient.uia.issue(
          'liang.BBB',
          String(20 * 1e8),
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        const issuePromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(issuePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Exceed issue limit',
        });

        await lib.onNewBlock();

        // After issue
        const afterIssue = await axios.get(
          'http://localhost:4096/api/uia/issuers/' + issuerName + '/assets'
        );
        expect(afterIssue.data.assets[0].quantity).toBe('0');
      },
      lib.oneMinute
    );
  });

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

    it(
      'should return the error: Invalid currency',
      async () => {
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
        const transfer = gnyClient.uia.transfer(
          'ABC.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          String(10 * 1e8),
          recipient,
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: transfer,
        };

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid currency',
        });

        await lib.onNewBlock();

        // after transfering
        const afterTransfer = await axios.get(
          'http://localhost:4096/api/uia/balances/' + recipient
        );
        expect(afterTransfer.data.balances).toHaveLength(0);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid recipient',
      async () => {
        // prepare
        await beforeUiaTransfer();

        // act
        let recipient = 'G';
        for (let i = 0; i < 50; i++) {
          recipient += 'h';
        }
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

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid recipient',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Insufficient balance',
      async () => {
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
        const transfer = gnyClient.uia.transfer(
          'ABC.BBB',
          String(50 * 1e8),
          recipient,
          undefined,
          genesisSecret
        );
        const transData = {
          transaction: transfer,
        };

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Insufficient balance',
        });

        await lib.onNewBlock();

        // after transfering
        const afterTransfer = await axios.get(
          'http://localhost:4096/api/uia/balances/' + recipient
        );
        expect(afterTransfer.data.balances).toHaveLength(0);
      },
      lib.oneMinute
    );

    it(
      'should return the error: Recipient name not exist',
      async () => {
        // prepare
        await beforeUiaTransfer();

        // before transfering
        const recipient = 'guQr4DM3aiTD36EARqDpbfsEHoNF';

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

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Recipient name not exist',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid recipient, if recipient address is equal to sender address',
      async () => {
        // prepare
        await beforeUiaTransfer();

        // act
        const recipient = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

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

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid recipient',
        });
      },
      lib.oneMinute
    );

    it(
      'should return the error: Invalid recipient, if recipient username is equal to sender username',
      async () => {
        // prepare
        await beforeUiaTransfer();

        // act
        const username = 'a1300';
        const recipient = 'a1300';

        // set usename
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );

        await lib.onNewBlock();

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

        const transferPromise = axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );

        expect(transferPromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Error: Invalid recipient',
        });
      },
      lib.oneMinute
    );
  });
});
