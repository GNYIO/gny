import 'jest-extended';
import gnyClient = require('../../index');

describe('GNY client', () => {
  it('should be object', () => {
    expect(gnyClient).toBeObject();
  });

  it('should have properties', () => {
    const properties = [
      'Connection',
      'basic',
      'crypto',
      'transaction',
      'uia',
      'utils',
      'Connection',
    ];

    properties.forEach(function(property) {
      expect(gnyClient).toHaveProperty(property);
    });
  });

  describe('crypto sha256 and address', () => {
    it('should be equal to the expected address', () => {
      const address = gnyClient.crypto.getAddress(
        '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20'
      );

      expect(address).toEqual('G3ENMYpn7kTwjyai49kJezjkJvaQk');
    });
  });
});
