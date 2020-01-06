/**
 * @jest-environment jsdom
 */
import * as lib from '../lib';
import * as gnyClient from '@gny/client';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

async function registerIssuerAsync(
  name: string,
  desc: string,
  secret = genesisSecret
) {
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
  name: string,
  desc: string,
  amount: string,
  precision: number,
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
}

describe('account', () => {
  const connection = new gnyClient.Connection();
  const accountApi = connection.api.Account;

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

  describe('Get account information', () => {
    describe('/openAccount', () => {
      it(
        'should open an account with public key',
        async done => {
          const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
          const { publicKey } = await accountApi.getPublicKey(address);
          const response = await accountApi.openAccount(publicKey);
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });

    describe('/getBalance', () => {
      it(
        'should get balance by the address',
        async done => {
          const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
          const response = await accountApi.getBalance(address);
          expect(response.success).toBeTruthy();
          done();
        },
        lib.oneMinute
      );
    });

    describe('/getAddressCurrencyBalance', () => {
      it(
        'should get the balance by the address and currency',
        async () => {
          const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
          const currecny = 'AAA.ONE';

          await registerIssuerAsync('AAA', 'liang');

          await Promise.all([
            registerAssetAsync('ONE', 'first description', String(10 * 1e8), 8),
          ]);
          await lib.onNewBlock();

          const trs = gnyClient.uia.issue(
            'AAA.ONE',
            String(10 * 1e8),
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

          const response = await accountApi.getAddressCurrencyBalance(
            address,
            currecny
          );
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getAccountByAddress', () => {
      it(
        'should get the account by address',
        async () => {
          const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
          const response = await accountApi.getAccountByAddress(address);
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getAccountByUsername', () => {
      it(
        'should get the account by username',
        async () => {
          // set username
          const username = 'xpgeng';
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

          const response = await accountApi.getAccountByUsername(username);
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getVotedDelegates', () => {
      it(
        'should get the voted delegates',
        async () => {
          // set username
          const username = 'xpgeng';
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

          // lock the account
          const lockTrs = gnyClient.basic.lock(183000, 30 * 1e8, genesisSecret);
          const lockTransData = {
            transaction: lockTrs,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            lockTransData,
            config
          );
          await lib.onNewBlock();

          // register delegate
          const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
          const delegateTransData = {
            transaction: delegateTrs,
          };
          await axios.post(
            'http://localhost:4096/peer/transactions',
            delegateTransData,
            config
          );
          await lib.onNewBlock();

          const trs = gnyClient.basic.vote(['xpgeng'], genesisSecret);

          const transData = {
            transaction: trs,
          };

          await axios.post(
            'http://localhost:4096/peer/transactions',
            transData,
            config
          );
          await lib.onNewBlock();

          const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
          const response = await accountApi.getVotedDelegates({
            address,
          });
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/countAccounts', () => {
      it(
        'should get the number of accounts',
        async () => {
          const response = await accountApi.countAccounts();
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });

    describe('/getPublicKey', () => {
      it(
        'should get the public key by address',
        async () => {
          const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
          const response = await accountApi.getPublicKey(address);
          expect(response.success).toBeTruthy();
        },
        lib.oneMinute
      );
    });
  });
});
