/**
 * @jest-environment jsdom
 */
import * as lib from './lib';
import * as gnyClient from '@gnyio/client';
import axios from 'axios';
import { generateAddress } from '@gnyio/utils';
import { randomBytes } from 'crypto';
import {
  ApiSuccess,
  IsIssuerWrapper,
  IssuerWrapper,
  IssuesWrapper,
  AssetsWrapper,
  AssetHoldersWrapper,
} from '@gnyio/interfaces';

const GNY_PORT = 14096;
const GNY_APP_NAME = 'app11';
const NETWORK_PREFIX = '172.30';
const env = lib.createEnvironmentVariables(
  GNY_PORT,
  GNY_APP_NAME,
  NETWORK_PREFIX
);
const DOCKER_COMPOSE_FILE =
  'config/integration/docker-compose.client-integration.yml';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'summer produce nation depth home scheme trade pitch marble season crumble autumn';

function randomAddress() {
  return generateAddress(randomBytes(32).toString('hex'));
}

async function beforeUiaTransfer(uiaApi: any) {
  // prepare registerIssuer
  const name = 'ABC';
  const desc = 'some desc';
  const secret = genesisSecret;

  await uiaApi.registerIssuer(name, desc, secret);
  await lib.onNewBlock(GNY_PORT);

  // prepare registerAsset
  await uiaApi.registerAsset(
    'BBB',
    'some desc',
    String(10 * 1e8),
    8,
    genesisSecret
  );
  await lib.onNewBlock(GNY_PORT);

  // prepare issue
  const issue = gnyClient.uia.issue('ABC.BBB', String(10 * 1e8), genesisSecret);
  const issueTransData = {
    transaction: issue,
  };
  await axios.post(
    `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
    issueTransData,
    config
  );
  await lib.onNewBlock(GNY_PORT);
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
    `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
    transData,
    config
  );
  await lib.onNewBlock(GNY_PORT);
}

describe('uia', () => {
  const connection = new gnyClient.Connection(
    '127.0.0.1',
    GNY_PORT,
    'localnet'
  );
  const uiaApi = connection.api.Uia;
  const contractUiaApi = connection.contract.Uia;

  beforeAll(async () => {
    await lib.stopOldInstances(DOCKER_COMPOSE_FILE, env);
    // do not build (this can run parallel)
    // await lib.buildDockerImage();
  }, lib.tenMinutes);

  beforeEach(async () => {
    await lib.spawnContainer(DOCKER_COMPOSE_FILE, env, GNY_PORT);
  }, lib.oneMinute * 3);

  afterEach(async () => {
    await lib.stopAndKillContainer(DOCKER_COMPOSE_FILE, env);
  }, lib.oneMinute);

  describe('/getIssuers', () => {
    it(
      'should get issuers',
      async () => {
        expect.assertions(1);

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = (await uiaApi.getIssuers(
          limit,
          offset
        )) as (ApiSuccess & IssuesWrapper);
        expect(response).toEqual({
          success: true,
          count: 1,
          issues: [
            // TODO: this property needs to be renamed
            {
              _version_: lib.matchPositiveNumber,
              desc: 'liang',
              issuerId: 'G2ofFMDz8GtWq9n65khKit83bWkQr',
              name: 'liang',
              tid: lib.matchTid,
            },
          ],
        });
      },
      lib.oneMinute
    );
  });

  describe('/isIssuer', () => {
    it(
      'should check if is an issuer',
      async () => {
        expect.assertions(1);

        const address = 'G2ofFMDz8GtWq9n65khKit83bWkQr';

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = (await uiaApi.isIssuer(address)) as (ApiSuccess &
          IsIssuerWrapper);
        expect(response).toEqual({
          success: true,
          isIssuer: true,
          issuerName: 'liang',
        });
      },
      lib.oneMinute
    );
  });

  describe('/getIssuer', () => {
    it(
      'should get an issuer by username',
      async () => {
        expect.assertions(1);

        const name = 'liang';
        const senderAddress = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );
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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = (await uiaApi.getIssuer(name)) as (ApiSuccess &
          IssuerWrapper);
        expect(response).toEqual({
          success: true,
          issuer: {
            _version_: 1,
            desc: 'liang',
            issuerId: senderAddress,
            name: 'liang',
            tid: lib.matchTid,
          },
        });
      },
      lib.oneMinute
    );
  });

  describe('/getIssuerAssets', () => {
    it(
      'should get assets by name',
      async () => {
        expect.assertions(1);

        const name = 'liang';
        const limit = 5;
        const offset = 0;
        const senderAddress = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          issuerTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          assetTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = (await uiaApi.getIssuerAssets(
          name,
          limit,
          offset
        )) as (ApiSuccess & AssetsWrapper);
        expect(response).toEqual({
          success: true,
          count: 1,
          assets: [
            {
              _version_: 1,
              desc: expect.any(String),
              issuer: {
                _version_: 1,
                desc: 'liang',
                issuerId: senderAddress,
                name: 'liang',
                tid: lib.matchTid,
              },
              issuerId: senderAddress,
              maximum: lib.matchPositiveOrZeroIntString,
              name: 'liang.BBB',
              precision: lib.matchPositiveNumber,
              quantity: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              timestamp: lib.matchPositiveNumber,
            },
          ],
        });
      },
      lib.oneMinute
    );
  });

  describe('/getAssets', () => {
    it(
      'should get assets',
      async () => {
        expect.assertions(1);

        const senderAddress = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          issuerTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          assetTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await uiaApi.getAssets();
        expect(response).toEqual({
          success: true,
          assets: [
            {
              _version_: lib.matchPositiveNumber,
              desc: expect.any(String),
              issuer: {
                _version_: lib.matchPositiveNumber,
                desc: 'liang',
                issuerId: senderAddress,
                name: 'liang',
                tid: lib.matchTid,
              },
              issuerId: senderAddress,
              maximum: lib.matchPositiveOrZeroIntString,
              name: 'liang.BBB',
              precision: lib.matchPositiveNumber,
              quantity: lib.matchPositiveOrZeroIntString,
              tid: lib.matchTid,
              timestamp: lib.matchPositiveNumber,
            },
          ],
          count: 1,
        });
      },
      lib.oneMinute
    );
  });

  describe('/getAsset', () => {
    it(
      'should get asset by username',
      async () => {
        expect.assertions(1);

        const senderAddress = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          issuerTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          assetTransData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await uiaApi.getAsset(name);
        expect(response).toEqual({
          success: true,
          asset: {
            _version_: 1,
            desc: expect.any(String),
            issuer: {
              _version_: lib.matchPositiveNumber,
              desc: 'liang',
              issuerId: senderAddress,
              name: 'liang',
              tid: lib.matchTid,
            },
            issuerId: senderAddress,
            maximum: lib.matchPositiveOrZeroIntString,
            name: 'liang.BBB',
            precision: lib.matchPositiveNumber,
            quantity: lib.matchPositiveOrZeroIntString,
            tid: lib.matchTid,
            timestamp: lib.matchPositiveNumber,
          },
        });
      },
      lib.oneMinute
    );
  });

  describe('/getBalances', () => {
    it(
      'should get balances by address',
      async () => {
        expect.assertions(1);

        const senderAddress = gnyClient.crypto.getAddress(
          gnyClient.crypto.getKeys(genesisSecret).publicKey
        );

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        // check balance of recipient
        const response = await uiaApi.getBalances(recipient);
        expect(response).toEqual({
          success: true,
          count: 1,
          balances: [
            {
              _version_: lib.matchPositiveNumber,
              address: recipient,
              balance: lib.matchPositiveOrZeroIntString,
              currency: 'ABC.BBB',
              flag: 2,
            },
          ],
        });
      },
      lib.oneMinute
    );
  });

  describe('/getBalance', () => {
    it(
      'should get balance by address and currency',
      async () => {
        expect.assertions(1);

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
          `http://127.0.0.1:${GNY_PORT}/peer/transactions`,
          transData,
          config
        );
        await lib.onNewBlock(GNY_PORT);

        const response = await uiaApi.getBalance(recipient, 'ABC.BBB');
        expect(response).toEqual({
          success: true,
          balance: {
            _version_: lib.matchPositiveNumber,
            address: recipient,
            balance: lib.matchPositiveOrZeroIntString,
            currency: 'ABC.BBB',
            flag: 2,
          },
        });
      },
      lib.oneMinute
    );
  });

  describe('/getHolders', () => {
    it(
      'should get balance',
      async () => {
        expect.assertions(9);

        const recipient = 'GTtysDoaWGKMt9Ax6iuscs1eoHeJ';
        await beforeUiaTransfer(contractUiaApi);
        await transferUiaTo(recipient);

        const data = (await uiaApi.getHolders('ABC.BBB')) as (ApiSuccess &
          AssetHoldersWrapper);

        expect(data.success).toEqual(true);
        expect(data.count).toEqual(2);
        expect(data.holders).toHaveLength(2);

        const first = data.holders[0];
        expect(first.address).toEqual('GTtysDoaWGKMt9Ax6iuscs1eoHeJ');
        expect(first.balance).toEqual(String(1000000000));
        expect(first.currency).toEqual('ABC.BBB');

        const second = data.holders[1];
        expect(second.address).toEqual('G2ofFMDz8GtWq9n65khKit83bWkQr');
        expect(second.balance).toEqual(String(0));
        expect(second.currency).toEqual('ABC.BBB');
      },
      1.5 * lib.oneMinute
    );

    it(
      'works with offset 1',
      async () => {
        expect.assertions(6);

        const recipient = 'GTtysDoaWGKMt9Ax6iuscs1eoHeJ';
        await beforeUiaTransfer(contractUiaApi);
        await transferUiaTo(recipient);

        const data = (await uiaApi.getHolders(
          'ABC.BBB',
          100,
          1
        )) as (ApiSuccess & AssetHoldersWrapper);
        console.log(`result: ${JSON.stringify(data, null, 2)}`);

        expect(data.success).toEqual(true);
        expect(data.count).toEqual(2);
        expect(data.holders).toHaveLength(1); // important

        const first = data.holders[0];

        expect(first.address).toEqual('G2ofFMDz8GtWq9n65khKit83bWkQr');
        expect(first.balance).toEqual(String(0));
        expect(first.currency).toEqual('ABC.BBB');
      },
      1.5 * lib.oneMinute
    );

    it(
      'works with limit 1',
      async () => {
        expect.assertions(6);

        const recipient = 'GTtysDoaWGKMt9Ax6iuscs1eoHeJ';
        await beforeUiaTransfer(contractUiaApi);
        await transferUiaTo(recipient);

        const data = (await uiaApi.getHolders('ABC.BBB', 1, 0)) as (ApiSuccess &
          AssetHoldersWrapper);
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
