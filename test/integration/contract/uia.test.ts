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
    it('should register the asset', async done => {
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
      done();
    });
  });

  describe('issue', () => {
    it('should update asset', async done => {
      const trs = gnyJS.uia.issue('ABC.BBB', String(10 * 1e8), genesisSecret);
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

  describe('transfer', () => {
    it('should transfer some amount to the recipient', async done => {
      const trs = gnyJS.uia.transfer(
        'ABC.BBB',
        String(10 * 1e8),
        lib.createRandomAddress(),
        undefined,
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
      done();
    });
  });
});
