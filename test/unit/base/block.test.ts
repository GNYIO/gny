import { BlockBase } from '../../../src/base/block';
import { KeyPair, IBlock, Transaction } from '../../../src/interfaces';
import * as ed from '../../../src/utils/ed';
import * as crypto from 'crypto';

import { createTransation } from './transaction.test';

function createRandomBytes(length: number) {
  return Buffer.from(crypto.randomBytes(length)).toString('hex');
}

export function createKeypair() {
  const randomstring = 'ABCDE';
  const hash = crypto
    .createHash('sha256')
    .update(randomstring, 'utf8')
    .digest();
  return ed.generateKeyPair(hash);
}

export function createBlock(height: number, keypair: KeyPair) {
  const block: IBlock = {
    height: height,
    version: 0,
    timestamp: height + 2003502305230,
    count: 0,
    fees: 0,
    reward: 0,
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
      block = createBlock(1, keypair);
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
      expect(fee).toEqual(10000000);
      done();
    });
  });

  describe('sign', () => {
    let block: IBlock;
    let keypair: KeyPair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
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
      block = createBlock(1, keypair);

      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      done();
    });

    it('should return true when valid signature is checked ', done => {
      const verified = BlockBase.verifySignature(block);
      expect(verified).toBeTruthy();
      done();
    });
  });

  describe('objectNormalize', () => {
    let block: IBlock;
    let keypair: KeyPair;
    let trs: Transaction;

    beforeEach(done => {
      trs = createTransation();
      keypair = createKeypair();
      block = createBlock(1, keypair);

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
      block.height = -1;
      try {
        BlockBase.normalizeBlock(block);
      } catch (e) {
        expect(e.message).toBe(
          'child "height" fails because ["height" must be larger than or equal to 0]'
        );
      }
    });
  });
});
