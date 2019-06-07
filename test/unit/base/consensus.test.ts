import { ConsensusBase } from '../../../src/base/consensus';
import { IScope, ManyVotes, KeyPair, IBlock } from '../../../src/interfaces';
import extendedJoi from '../../../src/utils/extendedJoi';
import { BlockBase } from '../../../src/base/block';

import { createKeypair, createBlock } from './block.test';

describe('Consensus', () => {
  describe('normalizeVotes', () => {
    let block;
    let keypairs;
    let votes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return the validated votes', done => {
      const validatedVotes = ConsensusBase.normalizeVotes(votes);
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
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      done();
    });

    it('should return votes', done => {
      const votes = ConsensusBase.createVotes(keypairs, block);
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
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return true when valid votes are checked ', done => {
      for (let i = 0; i < votes.signatures.length; ++i) {
        const item = votes.signatures[i];
        const verified = ConsensusBase.verifyVote(votes.height, votes.id, item);
        expect(verified).toBeTruthy();
      }
      done();
    });
  });

  describe.skip('addPendingVotes', () => {
    let block: IBlock;
    let keypairs: KeyPair[];
    let votes: ManyVotes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return undefined pendingBlocks property', done => {
      const pendingVotes = ConsensusBase.addPendingVotes(votes);
      expect(pendingVotes).toBeUndefined();
      done();
    });

    it('should return the pending votes', done => {
      ConsensusBase.pendingBlock = block;
      const pendingVotes = ConsensusBase.addPendingVotes(votes);
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
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return false when votes are not enough ', done => {
      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toBeFalsy();
      done();
    });

    it('should return true when votes are not enough ', done => {
      for (let i = 0; i < 67; i++) {
        keypairs.push(keypair);
      }
      votes = ConsensusBase.createVotes(keypairs, block);
      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
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
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    it('should return false when votes are not enough ', done => {
      const hasEnough = ConsensusBase.hasEnoughVotesRemote(votes);
      expect(hasEnough).toBeFalsy();
      done();
    });

    it('should return false when votes are not enough ', done => {
      for (let i = 0; i < 6; i++) {
        keypairs.push(keypair);
      }
      votes = ConsensusBase.createVotes(keypairs, block);
      const hasEnough = ConsensusBase.hasEnoughVotesRemote(votes);
      expect(hasEnough).toBeTruthy();
      done();
    });
  });

  describe.skip('hasEnoughVotesRemote', () => {
    let block;
    let keypair;
    let timestamp;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(1, keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      timestamp = block.timestamp;
      done();
    });

    it('should return false when remote votes are not enough ', done => {
      const existed = ConsensusBase.hasPendingBlock(timestamp);
      expect(existed).toBeFalsy();
      done();
    });

    it('should return false when remote votes are not enough ', done => {
      ConsensusBase.pendingBlock = block;
      const existed = ConsensusBase.hasPendingBlock(timestamp);
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
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      address = '127.0.0.1:6379';
      done();
    });

    it('should return a propse', done => {
      const propose = ConsensusBase.createPropose(keypair, block, address);
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
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      address = '127.0.0.1:6379';
      propose = ConsensusBase.createPropose(keypair, block, address);
      done();
    });

    it('should return undefined after successful verification', done => {
      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeUndefined();
      done();
    });
  });
});
