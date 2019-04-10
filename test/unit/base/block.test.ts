import { Block } from '../../../src/base/block';
import { IScope, KeyPair, IBlock } from '../../../src/interfaces';
import extendedJoi from '../../../src/utils/extendedJoi';
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
  let blockBase;

  const iScope = {
    joi: extendedJoi,
  } as IScope;

  beforeEach(done => {
    blockBase = new Block(iScope);
    done();
  });

  describe('getId', () => {
    let block;
    let keypair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
      done();
    });

    it('should return an id of the block', done => {
      const id = blockBase.getId(block);
      expect(id).toHaveLength(64);
      done();
    });
  });

  describe('calculateFee', () => {
    it('should return the fee', done => {
      const fee = blockBase.calculateFee();
      expect(fee).toEqual(10000000);
      done();
    });
  });

  describe('sign', () => {
    let block;
    let keypair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
      done();
    });

    it('should return the signature of the block', done => {
      const signature = blockBase.sign(block, keypair);
      expect(signature).toHaveLength(128);
      done();
    });
  });

  describe('verifySignature', () => {
    let block;
    let keypair;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);

      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      done();
    });

    it('should return true when valid signature is checked ', done => {
      const verified = blockBase.verifySignature(block);
      expect(verified).toBeTruthy();
      done();
    });
  });

  // describe('objectNormalize', () => {
  //   let block;
  //   let keypair;
  //   let trs;

  //   beforeEach(done => {
  //     trs = createTransation();
  //     keypair = createKeypair();
  //     block = createBlock(1, keypair);

  //     block.transactions = [trs];
  //     block.signature = blockBase.sign(block, keypair);
  //     block.id = blockBase.getId(block);
  //     done();
  //   });

  //   it('should return the normalized block', () => {
  //     console.log(block);
  //     const normalizedBlock = blockBase.objectNormalize(block);
  //     console.log({ normalizedBlock });
  //     expect(normalizedBlock).toEqual(block);
  //   });
  // });
});
