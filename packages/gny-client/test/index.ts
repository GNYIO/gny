import crypto_lib = require('crypto-browserify');
import should = require('should');
import gnyClient = require('../index.js');

describe('Gny JS', () => {
  it('should be ok', () => {
    gnyClient.should.be.ok;
  });

  it('should be object', () => {
    gnyClient.should.be.type('object');
  });

  it('should have properties', () => {
    const properties = [
      'transaction',
      'basic',
      'vote',
      'delegate',
      'chain',
      'crypto',
      'transfer',
      'uia',
      'options',
      'utils',
    ];

    properties.forEach(function(property) {
      gnyClient.should.have.property(property);
    });
  });

  describe('crypto sha256 and address', () => {
    it('should be equal to the expected address', () => {
      gnyClient.crypto
        .getAddress(
          '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20'
        )
        .should.be.equal('AFbYJhiJb3DXzHy5ZP24mKw21M2dCBJCXP');
      const publicKeyBuffer = new Buffer(
        '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20',
        'hex'
      );
      gnyClient.crypto
        .getAddress(publicKeyBuffer)
        .should.be.equal('AFbYJhiJb3DXzHy5ZP24mKw21M2dCBJCXP');
    });
  });
});
