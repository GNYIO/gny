import { Connection } from '../../connection';
import * as lib from './lib';
import * as gnyClient from '../../index';
import axios from 'axios';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

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
}

describe('accountsApi', () => {
  const connection = new Connection();
  const accountApi = connection.api('Account');

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

  describe('/generateAccount', () => {
    it(
      'should get the address and keys of the secet',
      async done => {
        const response = await accountApi.generateAccount();
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/openAccount', () => {
    it(
      'should get the address and keys of the secet',
      async done => {
        const secret =
          'swap try awkward damp noble kit undo whisper field wrestle marble chimney';
        const response = await accountApi.openAccount(secret);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getBalance', () => {
    it(
      'should get the address and keys of the secet',
      async done => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const response = await accountApi.getBalance(address);
        expect(response.status).toEqual(200);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getAddressCurrencyBalance', () => {
    it(
      'should get the address and keys of the secet',
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

        // try{
        //   const response = await accountApi.getAddressCurrencyBalance(address, currecny);
        //   console.log(response);
        // } catch(error) {
        //   console.log(error);
        // }

        const response = await accountApi.getAddressCurrencyBalance(
          address,
          currecny
        );
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getAccountByAddress', () => {
    it(
      'should get the address and keys of the secet',
      async () => {
        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const response = await accountApi.getAccountByAddress(address);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getAccountByUsername', () => {
    it(
      'should get the address and keys of the secet',
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
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/getVotedDelegates', () => {
    it(
      'should get the address and keys of the secet',
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

        const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const response = await accountApi.getVotedDelegates({
          address,
          username,
        });
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/countAccounts', () => {
    it(
      'should get the address and keys of the secet',
      async () => {
        const response = await accountApi.countAccounts();
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });

  describe('/generatePublicKey', () => {
    it(
      'should get the address and keys of the secet',
      async () => {
        const secret =
          'swap try awkward damp noble kit undo whisper field wrestle marble chimney';
        const response = await accountApi.generatePublicKey(secret);
        expect(response.status).toEqual(200);
      },
      lib.oneMinute
    );
  });
});
