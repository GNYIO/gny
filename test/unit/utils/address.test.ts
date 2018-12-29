import * as addressUtil from '../../../src/utils/address';

describe('address', () => {
  describe('generateAddress', () => {
    let address;
    beforeEach(done => {
      const publicKey = '8c9f363ef4e7fcad161f1cfaceff15b557956593f8dcd989139822f7e2abe6f4';
      address = addressUtil.generateAddress(publicKey);
      done();
    });

    it('should generate a address with a G prefix', () => {
      expect(address.startsWith('G')).toBeTruthy;
    });
  });

  describe('isAddress', () => {
    it('should return true if it is an address', () => {
      const address = 'GeVw2DVnLMx4ppcTojqNU7rQPvNW';
      expect(addressUtil.isAddress(address)).toBeTruthy;
    });

    it('should return false if it does not start with G', () => {
      const address = 'AeVw2DVnLMx4ppcTojqNU7rQPvNW';
      expect(addressUtil.isAddress(address)).toBeFalsy;
    });
  });
});