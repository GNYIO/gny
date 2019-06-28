import { ConsensusBase } from '../../../src/base/consensus';
import { KeyPair, IBlock, ManyVotes, Signature } from '../../../src/interfaces';
import { BlockBase } from '../../../src/base/block';
import * as ed from '../../../src/utils/ed';
import * as crypto from 'crypto';

function createRandomSignature() {
  const signature: Signature = {
    publicKey: randomHex(32),
    signature: randomHex(32),
  };
  return signature;
}

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
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

function createRandomBytes(length: number) {
  return Buffer.from(crypto.randomBytes(length)).toString('hex');
}

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

  describe('hasEnoughVotesRemote', () => {
    it('hasEnoughVotesRemote() - succeeds with 6 signatures', done => {
      // preparation
      const votes: ManyVotes = {
        height: 2,
        id: randomHex(32),
        signatures: [],
      };
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());

      // act
      const result = ConsensusBase.hasEnoughVotesRemote(votes);

      expect(result).toEqual(true);
      done();
    });

    it('hasEnoughVotesRemote() - fail if has only 5 or less signatures', done => {
      // preparation
      const votes: ManyVotes = {
        height: 2,
        id: randomHex(32),
        signatures: [],
      };
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());
      votes.signatures.push(createRandomSignature());

      // act
      const result = ConsensusBase.hasEnoughVotesRemote(votes);

      expect(result).toEqual(false);
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
