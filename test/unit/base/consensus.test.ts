import { Consensus } from '../../../src/base/consensus';
import { IScope, ManyVotes, KeyPair, IBlock } from '../../../src/interfaces';
import extendedJoi from '../../../src/utils/extendedJoi';
import { Block } from '../../../src/base/block';

import { createKeypair, createBlock } from './block.test';

describe('Consensus', () => {
  let consensusBase;
  let blockBase;

  const iScope = {
    joi: extendedJoi,
  } as IScope;

  beforeEach(done => {
    consensusBase = new Consensus(iScope);
    blockBase = new Block(iScope);
    done();
  });

  describe('normalizeVotes', () => {
    let block;
    let keypairs;
    let votes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      votes = consensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return the validated votes', done => {
      const validatedVotes = consensusBase.normalizeVotes(votes);
      expect(validatedVotes).toBe(votes);
      done();
    });
  });

  describe('createVotes', () => {
    let block;
    let keypairs;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      done();
    });

    it('should return votes', done => {
      const votes = consensusBase.createVotes(keypairs, block);
      expect(votes).toHaveProperty('height');
      expect(votes).toHaveProperty('id');
      expect(votes).toHaveProperty('signatures');
      done();
    });
  });

  describe('verifyVote', () => {
    let block;
    let keypairs;
    let votes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      votes = consensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return true when valid votes are checked ', done => {
      for (let i = 0; i < votes.signatures.length; ++i) {
        const item = votes.signatures[i];
        const verified = consensusBase.verifyVote(votes.height, votes.id, item);
        expect(verified).toBeTruthy();
      }
      done();
    });
  });

  describe('addPendingVotes', () => {
    let block;
    let keypairs;
    let votes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      votes = consensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return null', done => {
      const pendingVotes = consensusBase.addPendingVotes(votes);
      expect(pendingVotes).toBe(null);
      done();
    });

    it('should return the pending votes', done => {
      consensusBase.pendingBlock = block;
      const pendingVotes = consensusBase.addPendingVotes(votes);
      expect(pendingVotes).toHaveProperty('height');
      expect(votes).toHaveProperty('id');
      expect(votes).toHaveProperty('signatures');
      done();
    });
  });

  describe('hasEnoughVotes', () => {
    let block;
    let keypair;
    let keypairs;
    let votes;

    beforeEach(done => {
      keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      votes = consensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return false when votes are not enough ', done => {
      const hasEnough = consensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toBeFalsy();
      done();
    });

    it('should return true when votes are not enough ', done => {
      for (let i = 0; i < 67; i++) {
        keypairs.push(keypair);
      }
      votes = consensusBase.createVotes(keypairs, block);
      const hasEnough = consensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toBeTruthy();
      done();
    });
  });

  describe('hasEnoughVotesRemote', () => {
    let block;
    let keypair;
    let keypairs;
    let votes;

    beforeEach(done => {
      keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      votes = consensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return false when votes are not enough ', done => {
      const hasEnough = consensusBase.hasEnoughVotesRemote(votes);
      expect(hasEnough).toBeFalsy();
      done();
    });

    it('should return false when votes are not enough ', done => {
      for (let i = 0; i < 6; i++) {
        keypairs.push(keypair);
      }
      votes = consensusBase.createVotes(keypairs, block);
      const hasEnough = consensusBase.hasEnoughVotesRemote(votes);
      expect(hasEnough).toBeTruthy();
      done();
    });
  });

  describe('hasEnoughVotesRemote', () => {
    let block;
    let keypair;
    let timestamp;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      timestamp = block.timestamp;
      done();
    });

    it('should return false when remote votes are not enough ', done => {
      const existed = consensusBase.hasPendingBlock(timestamp);
      expect(existed).toBeFalsy();
      done();
    });

    it('should return false when remote votes are not enough ', done => {
      consensusBase.pendingBlock = block;
      const existed = consensusBase.hasPendingBlock(timestamp);
      expect(existed).toBeTruthy();
      done();
    });
  });

  describe('createPropose', () => {
    let block;
    let keypair;
    let address;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      address = '127.0.0.1:6379';
      done();
    });

    it('should return a propse', done => {
      const propose = consensusBase.createPropose(keypair, block, address);
      expect(propose).toHaveProperty('signature');
      done();
    });
  });

  describe('acceptPropose', () => {
    let block;
    let keypair;
    let address;
    let propose;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      address = '127.0.0.1:6379';
      propose = consensusBase.createPropose(keypair, block, address);
      done();
    });

    it('should return a string about successful verification', done => {
      const accepted = consensusBase.acceptPropose(propose);
      expect(accepted).toEqual('Verify propose successful.');
      done();
    });
  });
});
