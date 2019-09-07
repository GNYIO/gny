import { ConsensusBase } from '../../../packages/base/consensusBase';
import {
  KeyPair,
  IBlock,
  ManyVotes,
  Signature,
  BlockPropose,
} from '../../../packages/interfaces';
import { BlockBase } from '../../../packages/base/blockBase';
import * as ed from '../../../packages/ed';
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

export function createBlock(height: string, keypair: KeyPair) {
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

function createRandomBytes(length: number) {
  return Buffer.from(crypto.randomBytes(length)).toString('hex');
}

describe('Consensus', () => {
  describe('normalizeVotes', () => {
    let block: IBlock;
    let keypairs: KeyPair[];
    let votes: ManyVotes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    afterEach(done => {
      block = undefined;
      keypairs = undefined;
      votes = undefined;
      done();
    });

    it('should return the validated votes', done => {
      const validatedVotes = ConsensusBase.normalizeVotes(votes);
      expect(validatedVotes).toBe(votes);
      done();
    });
  });

  describe('createVotes', () => {
    let block: IBlock;
    let keypairs: KeyPair[];

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      done();
    });

    afterEach(done => {
      block = undefined;
      keypairs = undefined;
      done();
    });

    it('createVotes() - should return vote signatures', done => {
      // check before
      expect(keypairs).toHaveLength(1);

      // act
      const votes = ConsensusBase.createVotes(keypairs, block);

      // assert
      expect(votes).toHaveProperty('height');
      expect(votes).toHaveProperty('id');
      expect(votes).toHaveProperty('signatures');
      expect(votes.signatures).toHaveLength(1);

      done();
    });
  });

  describe('verifyVote', () => {
    let block: IBlock;
    let keypairs: KeyPair[];
    let votes: ManyVotes;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    afterEach(done => {
      block = undefined;
      keypairs = undefined;
      votes = undefined;
      done();
    });

    it('verifyVote() - should return true when valid votes are checked ', done => {
      expect.assertions(2); // one check before, one actual assertion

      // check before
      expect(votes.signatures).toHaveLength(1);

      for (let i = 0; i < votes.signatures.length; ++i) {
        const item = votes.signatures[i];
        const verified = ConsensusBase.verifyVote(votes.height, votes.id, item);
        expect(verified).toBeTruthy();
      }
      done();
    });
  });

  describe('hasEnoughVotes', () => {
    let block: IBlock;
    let keypair: KeyPair;
    let keypairs: KeyPair[];
    let votes: ManyVotes;

    beforeEach(done => {
      keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
      done();
    });

    afterEach(done => {
      block = undefined;
      keypair = undefined;
      keypairs = undefined;
      votes = undefined;
      done();
    });

    it('hasEnoughVotes() - 1 vote is not enough', done => {
      expect(votes.signatures).toHaveLength(1);
      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toBeFalsy();
      done();
    });

    it('hasEnoughVotes() - 67 votes are not enough', done => {
      keypairs = [];
      for (let i = 0; i < 67; i++) {
        keypairs.push(keypair);
      }
      votes = ConsensusBase.createVotes(keypairs, block);
      expect(votes.signatures).toHaveLength(67);

      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toBeFalsy();
      done();
    });

    it('hasEnoughVotes() - 68 votes are enough', done => {
      keypairs = [];
      for (let i = 0; i < 68; i++) {
        keypairs.push(keypair);
      }
      votes = ConsensusBase.createVotes(keypairs, block);
      expect(votes.signatures).toHaveLength(68);

      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
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
    let block: IBlock;
    let keypair: KeyPair;
    let address: string;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      address = '127.0.0.1:6379';
      done();
    });

    afterEach(done => {
      block = undefined;
      keypair = undefined;
      address = undefined;
      done();
    });

    it('createPropose() - should return a propse', done => {
      const propose = ConsensusBase.createPropose(keypair, block, address);
      expect(propose).toHaveProperty('signature');
      done();
    });

    it('createPropose() - should throw when public keys do not match', () => {
      // preparation ()
      keypair.publicKey = Buffer.from('wrong publicKey');

      // act and assert
      return expect(() =>
        ConsensusBase.createPropose(keypair, block, address)
      ).toThrow('delegate public keys do not match');
    });
  });

  describe('acceptPropose', () => {
    let block: IBlock;
    let keypair: KeyPair;
    let address: string;
    let propose: BlockPropose;

    beforeEach(done => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      address = '127.0.0.1:6379';
      propose = ConsensusBase.createPropose(keypair, block, address);
      done();
    });

    afterEach(done => {
      block = undefined;
      keypair = undefined;
      address = undefined;
      propose = undefined;
      done();
    });

    it('acceptPropose() - should return true after successful verification', done => {
      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeTruthy();
      done();
    });

    it('acceptPropose() - returns false when propose is undefined', done => {
      // prepration
      propose = undefined;

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeFalsy();
      done();
    });

    it('acceptPropose() - returns false when propose is empty object', done => {
      // prepration
      propose = {} as BlockPropose;

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeFalsy();
      done();
    });

    it('acceptPropose() - returns false when propose hash is wrong', done => {
      // prepration
      propose.hash = Buffer.from('wrong hash').toString('hex');

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeFalsy();
      done();
    });

    it('acceptPropose() - returns false when "height" property was manipulated', done => {
      // check before
      expect(propose.height).toEqual(String(1));
      // prepration
      propose.height = String(2);

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeFalsy();
      done();
    });

    it('acceptPropose() - returns false when "address" property was manipulated', done => {
      // check before
      expect(propose.address).toEqual('127.0.0.1:6379');
      // prepration
      propose.address = '49.1.91.33:1234';

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeFalsy();
      done();
    });

    it('acceptPropose() - returns false when "generatorPublicKey" property was manipulated', done => {
      // prepration
      propose.generatorPublicKey = randomHex(32);

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toBeFalsy();
      done();
    });
  });
});
