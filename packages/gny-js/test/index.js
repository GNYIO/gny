var Buffer = require('buffer/').Buffer;
var crypto_lib = require('crypto-browserify');
var should = require('should');
var gnyJS = require('../index.js');

describe('Gny JS', () => {
  it('should be ok', () => {
    gnyJS.should.be.ok;
  });

  it('should be object', () => {
    gnyJS.should.be.type('object');
  });

  it('should have properties', () => {
    var properties = [
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
      gnyJS.should.have.property(property);
    });
  });

  describe('crypto sha256 and address', () => {
    it('should be equal to the expected address', () => {
      gnyJS.crypto
        .getAddress(
          '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20'
        )
        .should.be.equal('AFbYJhiJb3DXzHy5ZP24mKw21M2dCBJCXP');
      var publicKeyBuffer = new Buffer(
        '7a91b9bfc0ea185bf3ade9d264da273f7fe19bf71008210b1d7239c82dd3ad20',
        'hex'
      );
      gnyJS.crypto
        .getAddress(publicKeyBuffer)
        .should.be.equal('AFbYJhiJb3DXzHy5ZP24mKw21M2dCBJCXP');
    });
  });
});
