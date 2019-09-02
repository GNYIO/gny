import crypto_lib = require('crypto-browserify');
import should = require('should');
import gny_client = require('../index.js');

describe('Gny JS', () => {
  it('should be ok', () => {
    gny_client.should.be.ok;
  });

  it('should be object', () => {
    gny_client.should.be.type('object');
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
      gny_client.should.have.property(property);
    });
  });

  describe('crypto sha256 and address', () => {
    it('should be equal to the expected address', () => {
      gny_client.crypto
        .getAddress(
          '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20'
        )
        .should.be.equal('AFbYJhiJb3DXzHy5ZP24mKw21M2dCBJCXP');
      const publicKeyBuffer = new Buffer(
        '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20',
        'hex'
      );
      gny_client.crypto
        .getAddress(publicKeyBuffer)
        .should.be.equal('AFbYJhiJb3DXzHy5ZP24mKw21M2dCBJCXP');
    });
  });
});
