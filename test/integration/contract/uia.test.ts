import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

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
    it('should regitster an issuer', async done => {
      const trs = gnyJS.uia.registerIssuer('liang', 'liang', genesisSecret);
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
      done();
    });
  });

  describe('registerAsset', () => {
    it(
      'should register the asset',
      async () => {
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

        const trs = gnyJS.uia.registerAsset(
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
      },
      lib.oneMinute
    );
  });

  describe('issue', () => {
    it(
      'should update asset',
      async () => {
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

        const trs = gnyJS.uia.issue(
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
      },
      lib.oneMinute
    );
  });

  // describe('transfer', () => {
  //   it('should transfer some amount to the recipient', async () => {
  //     let keys = gnyJS.crypto.getKeys(genesisSecret);

  //     // Init sender account with some amount
  //     // const secret = 'bar light swap bring check blush later suggest broken egg wisdom rose';
  //     const senderId = gnyJS.crypto.getAddress(keys.publicKey);
  //     const amount = 5 * 1e8;
  //     const message = '';
  //     const senderTrs = gnyJS.basic.transfer(
  //       senderId,
  //       amount,
  //       message,
  //       genesisSecret
  //     );
  //     const senderTransData = {
  //       transaction: senderTrs,
  //     };
  //     // await axios.post(
  //     //   'http://localhost:4096/peer/transactions',
  //     //   senderTransData,
  //     //   config
  //     // );

  //     try {
  //       await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         senderTransData,
  //         config
  //       );
  //     } catch (e) {
  //       console.log(e.response.data);
  //     }

  //     await lib.onNewBlock();

  //     const trs = gnyJS.uia.transfer(
  //       '',
  //       String(1 * 1e8),
  //       lib.createRandomAddress(),
  //       undefined,
  //       genesisSecret
  //     );
  //     const transData = {
  //       transaction: trs,
  //     };

  //     try {
  //       const { data } = await axios.post(
  //         'http://localhost:4096/peer/transactions',
  //         transData,
  //         config
  //       );
  //     } catch (e) {
  //       console.log(e.response.data);
  //     }

  //     // const { data } = await axios.post(
  //     //   'http://localhost:4096/peer/transactions',
  //     //   transData,
  //     //   config
  //     // );

  //     // expect(data).toHaveProperty('success', true);
  //     // expect(data).toHaveProperty('transactionId');
  //     // done();
  //   }, lib.oneMinute);
  // });
});
