import 'jest-extended';
import * as gnyClient from '../../index';
import { joi } from '@gny/extendedJoi';

describe('crypto.js', () => {
  const crypto = gnyClient.crypto;

  let bytes;
  let getBytes;
  let getHash;
  let getId;
  let getFee;
  let fixedPoint;
  let sign;
  let secondSign;
  let getKeys;
  let getAddress;
  let verify;
  let verifySecondSignature;

  beforeEach(() => {
    bytes = null;
    getBytes = crypto.getBytes;
    getHash = crypto.getHash;
    getId = crypto.getId;
    getFee = crypto.getFee;
    fixedPoint = crypto.fixedPoint;
    sign = crypto.sign;
    secondSign = crypto.secondSign;
    getKeys = crypto.getKeys;
    getAddress = crypto.getAddress;
    verify = crypto.verify;
    verifySecondSignature = crypto.verifySecondSignature;
  });

  afterEach(() => {
    bytes = null;
  });

  it('should be object', () => {
    expect(crypto).toBeObject();
  });

  it('should has properties', () => {
    const properties = [
      'getBytes',
      'getHash',
      'getId',
      'getFee',
      'sign',
      'secondSign',
      'getKeys',
      'getAddress',
      'verify',
      'verifySecondSignature',
      'fixedPoint',
    ];
    properties.forEach(function(property) {
      expect(crypto).toHaveProperty(property);
    });
  });

  describe('#getBytes', () => {
    it('should return Buffer of simply transaction and buffer most be 155 length', () => {
      const transaction = {
        type: 1,
        timestamp: 68365026,
        fee: 10000000,
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
        senderPublicKey:
          '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
        senderId: 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv',
        signatures: [
          '6b9a02208c0c36a0adf527d117cc3840f4b6c0a6eeac8cd212635f120592a101b68aeae0efe43ee28b0fd2add6fdb14f6b51b5ebff467b02909f4cdd66276603',
        ],
        id: '43a9ed49665d7e905b717e54f39b1d9976e3332608bacf6083a3e130a0d12eed',
      };

      bytes = getBytes(transaction);
      expect(bytes).toBeObject();
      expect(bytes.length).toEqual(155);
    });

    it('should return Buffer of transaction with second signature and buffer most be 219 length', () => {
      const transaction = {
        type: 1,
        timestamp: 68365928,
        fee: 10000000,
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
        senderPublicKey:
          '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
        senderId: 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv',
        signatures: [
          'e1da25b8278d9cf4dcb32d8be73681ce701f0f01518b3d68e80c235a0f9d7d3fcfae7d454976f82535bc181fccd0f7cefc2fe3f1f158e76789a775bdce1d2906',
        ],
        secondSignature:
          '067ec26a4bc1cb84926b49bb85e5701bebb2a8d4d4aef2c7fe075e2b6ca7e8a4c3ca77e709262d58760f4f3f3d00bdfc3f32c2be6c92856b29366e4d4ef77703',
        id: '7608330225429661920fbdad67abc7c8b220c212a112bd76a1e33134cc082473',
      };

      bytes = getBytes(transaction);
      expect(bytes).toBeObject();
      expect(bytes.length).toEqual(219);
    });
  });

  describe('#getHash', () => {
    it('should return Buffer and Buffer must be 32 bytes length', () => {
      const transaction = {
        type: 1,
        timestamp: 68365026,
        fee: 10000000,
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
        senderPublicKey:
          '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
        senderId: 'ABuH9VHV3cFi9UKzcHXGMPGnSC4QqT2cZ5',
        signatures: [
          '6b9a02208c0c36a0adf527d117cc3840f4b6c0a6eeac8cd212635f120592a101b68aeae0efe43ee28b0fd2add6fdb14f6b51b5ebff467b02909f4cdd66276603',
        ],
      };

      const result = getHash(transaction);
      expect(result).toBeObject();
      expect(result.length).toEqual(32);
    });
  });

  describe('#getId', () => {
    it('should return string id and be equal to 43a9ed49665d7e905b717...', () => {
      const transaction = {
        type: 1,
        timestamp: 68365026,
        fee: 10000000,
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
        senderPublicKey:
          '116025d5664ce153b02c69349798ab66144edd2a395e822b13587780ac9c9c09',
        senderId: 'ABuH9VHV3cFi9UKzcHXGMPGnSC4QqT2cZ5',
        signatures: [
          '6b9a02208c0c36a0adf527d117cc3840f4b6c0a6eeac8cd212635f120592a101b68aeae0efe43ee28b0fd2add6fdb14f6b51b5ebff467b02909f4cdd66276603',
        ],
      };

      const id = getId(transaction);
      expect(id).toBeString();
      expect(id).toEqual(
        '07152e2898a19b1547de48f81d92ed696b33ff9fe00f7abd1bfbe40b39e521aa'
      );
    });
  });

  describe('#getFee', () => {
    it('should return number', () => {
      const fee = getFee({ amount: 100000, type: 0 });
      expect(fee).toBeNumber();
      expect(fee).not.toBeNull();
    });

    it('should return 10000000', () => {
      const fee = getFee({ amount: 100000, type: 0 });
      expect(fee).toBeNumber();
      expect(fee).toEqual(10000000);
    });

    it('should return 10000000000', () => {
      const fee = getFee({ type: 1 });
      expect(fee).toBeNumber();
      expect(fee).toEqual(10000000000);
    });

    it('should be equal 1000000000000', () => {
      const fee = getFee({ type: 2 });
      expect(fee).toBeNumber();
      expect(fee).toEqual(1000000000000);
    });

    it('should be equal 100000000', () => {
      const fee = getFee({ type: 3 });
      expect(fee).toBeNumber();
      expect(fee).toEqual(100000000);
    });
  });

  describe('fixedPoint', () => {
    it('should be number and equal to 100000000', () => {
      expect(fixedPoint).toBeNumber();
      expect(fixedPoint).toEqual(100000000);
    });
  });

  describe('#sign', () => {
    it('should be a function', () => {
      expect(sign).toBeFunction();
    });
  });

  describe('#secondSign', () => {
    it('should be a function', () => {
      expect(secondSign).toBeFunction();
    });
  });

  describe('#getKeys', () => {
    it('should return two keys in hex', () => {
      const keys = getKeys('secret');

      expect(keys).toBeObject();
      expect(keys).toHaveProperty('publicKey');
      expect(keys).toHaveProperty('privateKey');

      const publicSchema = joi
        .string()
        .hex(32)
        .required();

      const publicReport = joi.validate(keys.publicKey, publicSchema);
      expect(publicReport.error).toBeNull();

      const privateSchema = joi
        .string()
        .hex(64)
        .required();
      const privateReport = joi.validate(keys.privateKey, privateSchema);
      expect(privateReport.error).toBeNull();
    });
  });

  describe('#getAddress', () => {
    it('should generate address by publicKey', () => {
      const keys = crypto.getKeys('secret');
      const address = getAddress(keys.publicKey);

      expect(address).toBeString();
      expect(address).toEqual('G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv');
    });
  });

  describe('#verify', () => {
    it('should be function', () => {
      expect(verify).toBeFunction();
    });
  });

  describe('#verifySecondSignature', () => {
    it('should be function', () => {
      expect(verifySecondSignature).toBeFunction();
    });
  });
});
