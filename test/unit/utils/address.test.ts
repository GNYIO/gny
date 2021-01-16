import {
  generateAddress,
  isAddress,
} from '../../../packages/utils/src/address';

describe('address', () => {
  describe('generateAddress', () => {
    let address;
    beforeEach(done => {
      const publicKey =
        '8c9f363ef4e7fcad161f1cfaceff15b557956593f8dcd989139822f7e2abe6f4';
      address = generateAddress(publicKey);
      done();
    });

    it('should generate a address with a G prefix', () => {
      expect(address.startsWith('G')).toBeTruthy;
    });
  });

  describe('isAddress', () => {
    it('should return true if it is an address', () => {
      const address = 'GeVw2DVnLMx4ppcTojqNU7rQPvNW';
      expect(isAddress(address)).toBeTruthy;
    });

    it('should return false if it does not start with G', () => {
      const address = 'AeVw2DVnLMx4ppcTojqNU7rQPvNW';
      expect(isAddress(address)).toBeFalsy;
    });

    it('should return false if address is ony G', () => {
      const address = 'G';
      expect(isAddress(address)).toEqual(false);
    });

    it('should return false on too short address', () => {
      const address = 'GAeVw2DVnLMx4p';
      expect(isAddress(address)).toEqual(false);
    });

    it('should return false on too long address', () => {
      const address = 'G' + 'eVw2DVnLMx4ppcTojqNU7rQPvNW' + '4';
      expect(isAddress(address)).toEqual(false);
    });

    it('should return false on empty string', () => {
      const address = '';
      expect(isAddress(address)).toEqual(false);
    });

    it('should return false on shorter address', () => {
      const address = 'GeVw2DVnLMx4ppcTojqNU7rQPvN'; // removed last W
      expect(isAddress(address)).toEqual(false);
    });

    it('should return on address with dollar symbol', () => {
      const address = 'GeVw2DVnLMx4ppcTojqNU7rQPvN$'; // removed last W
      expect(isAddress(address)).toEqual(false);
    });
  });
});
