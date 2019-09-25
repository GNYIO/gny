import { BlockBase } from '../../../packages/base/src/blockBase';
import {
  KeyPair,
  IBlock,
  ITransaction,
} from '../../../packages/interfaces/src/index';
import * as ed from '../../../packages/ed/src/index';
import * as crypto from 'crypto';

function createTransation() {
  const data: ITransaction = {
    type: 10,
    fee: String(10000000000),
    timestamp: 12165155,
    senderId: 'G2WocDNFv5ZPwxAia3sjREq7qWM2C',
    senderPublicKey:
      '2e65eb2d727adb6b39557c27093562aa93a9f8bad33a2d261acf4fce380c59b9',
    message: '',
    args: [40000000000000000, 'G4GDW6G78sgQdSdVAQUXdm5xPS13t'],
    signatures: [
      '1a7d4b477840ad70e81edf932a52784575d811a61ad337f901627380e13407069ad487f35958dca5a7e0954aa18742823a96ad157e72f4316090c7b5161fb80d',
    ],
    secondSignature:
      '9197c401ae2c72532e0d16340ec920639798714962e03c50d6742ed91944b5a8246e0f83d761435f2619a3413e3dd0f5fa8070c00d2f44ff99d5ac9600fe4b02',
    id: '180a6e8e69f56892eb212edbf0311c13d5219f6258de871e60fac54829979540',
    height: String(0),
  };
  return data;
}
function createRandomBytes(length: number) {
  return Buffer.from(crypto.randomBytes(length)).toString('hex');
}

function createKeypair() {
  const randomstring = 'ABCDE';
  const hash = crypto
    .createHash('sha256')
    .update(randomstring, 'utf8')
    .digest();
  return ed.generateKeyPair(hash);
}

function createBlock(height: string, keypair: KeyPair) {
  const block: IBlock = {
    height: height,
    version: 0,
    timestamp: 2003502305230,
    count: 0,
    fees: String(0),
    reward: String(0),
    signature: null,
    id: null,
    transactions: [],
    delegate: keypair.publicKey.toString('hex'),
    payloadHash: createRandomBytes(32),
  };

  return block;
}

describe('Transaction', () => {
  describe('getId', () => {
    let block: IBlock;
    let keypair: KeyPair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);
      done();
    });

    it('should return an id of the block', done => {
      const id = BlockBase.getId(block);
      expect(id).toHaveLength(64);
      done();
    });
  });

  describe('calculateFee', () => {
    it('should return the fee', done => {
      const fee = BlockBase.calculateFee();
      expect(fee).toEqual(String(10000000));
      done();
    });
  });

  describe('sign', () => {
    let block: IBlock;
    let keypair: KeyPair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);
      done();
    });

    it('should return the signature of the block', done => {
      const signature = BlockBase.sign(block, keypair);
      expect(signature).toHaveLength(128);
      done();
    });
  });

  describe('verifySignature', () => {
    let block: IBlock;
    let keypair: KeyPair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);

      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      done();
    });

    it('should return true when valid signature is checked ', done => {
      const verified = BlockBase.verifySignature(block);
      expect(verified).toBeTruthy();
      done();
    });

    it('should return false when signature is not valid', done => {
      // prepare
      block.signature = 'wrongSignature';
      // act
      const verified = BlockBase.verifySignature(block);
      // assert
      expect(verified).toBeFalsy();
      done();
    });
  });

  describe('objectNormalize', () => {
    let block: IBlock;
    let keypair: KeyPair;
    let trs: ITransaction;

    beforeEach(done => {
      trs = createTransation();
      keypair = createKeypair();
      block = createBlock(String(1), keypair);

      block.transactions = [trs];
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      done();
    });

    it('should return the normalized block', () => {
      const normalizedBlock = BlockBase.normalizeBlock(block);
      expect(normalizedBlock).toEqual(block);
    });

    it('should throw error if there are errors during validation', () => {
      block.height = String(-1);
      try {
        BlockBase.normalizeBlock(block);
      } catch (e) {
        expect(e.message).toBe(
          'child "height" fails because ["height" is not a positive or zero big integer amount]'
        );
      }
    });
  });
});
