import { ConsensusBase } from '@gnyio/base';
import { KeyPair, IBlock, ManyVotes, BlockPropose } from '@gnyio/interfaces';
import { BlockBase } from '@gnyio/base';
import * as ed from '@gnyio/ed';
import * as crypto from 'crypto';
import assert from 'assert';

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
  describe('createVotes', () => {
    let block: IBlock;
    let keypairs: KeyPair[];

    beforeEach(() => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
    });

    afterEach(() => {
      block = undefined;
      keypairs = undefined;
    });

    it('createVotes() - should return vote signatures', () => {
      // check before
      expect(keypairs).toHaveLength(1);

      // act
      const votes = ConsensusBase.createVotes(keypairs, block);

      // assert
      expect(votes).toHaveProperty('height');
      expect(votes).toHaveProperty('id');
      expect(votes).toHaveProperty('signatures');
      expect(votes.signatures).toHaveLength(1);
    });
  });

  describe('verifyVote', () => {
    let block: IBlock;
    let keypairs: KeyPair[];
    let votes: ManyVotes;

    beforeEach(() => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
    });

    afterEach(() => {
      block = undefined;
      keypairs = undefined;
      votes = undefined;
    });

    it('verifyVote() - should return true when valid votes are checked ', () => {
      expect.assertions(2); // one check before, one actual assertion

      // check before
      expect(votes.signatures).toHaveLength(1);

      for (let i = 0; i < votes.signatures.length; ++i) {
        const item = votes.signatures[i];
        const verified = ConsensusBase.verifyVote(votes.height, votes.id, item);
        expect(verified).toBeTruthy();
      }
    });
  });

  describe('hasEnoughVotes', () => {
    let block: IBlock;
    let keypair: KeyPair;
    let keypairs: KeyPair[];
    let votes: ManyVotes;

    beforeEach(() => {
      keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      votes = ConsensusBase.createVotes(keypairs, block);
    });

    afterEach(() => {
      block = undefined;
      keypair = undefined;
      keypairs = undefined;
      votes = undefined;
    });

    it('hasEnoughVotes() - 1 vote is not enough', () => {
      expect.assertions(2);

      expect(votes.signatures).toHaveLength(1);
      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toEqual(false);
    });

    it('hasEnoughVotes() - 67 votes are not enough', () => {
      expect.assertions(2);

      keypairs = [];
      for (let i = 0; i < 67; i++) {
        keypairs.push(keypair);
      }
      votes = ConsensusBase.createVotes(keypairs, block);
      expect(votes.signatures).toHaveLength(67);

      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toEqual(false);
    });

    it('hasEnoughVotes() - 68 votes are enough', () => {
      keypairs = [];
      for (let i = 0; i < 68; i++) {
        keypairs.push(keypair);
      }
      votes = ConsensusBase.createVotes(keypairs, block);
      expect(votes.signatures).toHaveLength(68);

      const hasEnough = ConsensusBase.hasEnoughVotes(votes);
      expect(hasEnough).toEqual(true);
    });
  });

  describe('createPropose', () => {
    let block: IBlock;
    let keypair: KeyPair;
    let address: string;

    beforeEach(() => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      address = '127.0.0.1:6379';
    });

    afterEach(() => {
      block = undefined;
      keypair = undefined;
      address = undefined;
    });

    it('createPropose() - should return a propse', () => {
      expect.assertions(1);

      const propose = ConsensusBase.createPropose(keypair, block, address);
      expect(propose).toHaveProperty('signature');
    });

    it('createPropose() - should throw when public keys do not match', () => {
      expect.assertions(1);

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

    beforeEach(() => {
      keypair = createKeypair();
      block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      address = '127.0.0.1:6379';
      propose = ConsensusBase.createPropose(keypair, block, address);
    });

    afterEach(() => {
      block = undefined;
      keypair = undefined;
      address = undefined;
      propose = undefined;
    });

    it('acceptPropose() - should return true after successful verification', () => {
      expect.assertions(1);

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(true);
    });

    it('acceptPropose() - returns false when propose is undefined', () => {
      expect.assertions(1);

      // prepration
      propose = undefined;

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(false);
    });

    it('acceptPropose() - returns false when propose is empty object', () => {
      expect.assertions(1);

      // prepration
      propose = {} as BlockPropose;

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(false);
    });

    it('acceptPropose() - returns false when propose hash is wrong', () => {
      expect.assertions(1);

      // prepration
      propose.hash = Buffer.from('wrong hash').toString('hex');

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(false);
    });

    it('acceptPropose() - returns false when "height" property was manipulated', () => {
      expect.assertions(2);

      // check before
      expect(propose.height).toEqual(String(1));
      // prepration
      propose.height = String(2);

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(false);
    });

    it('acceptPropose() - returns false when "address" property was manipulated', () => {
      expect.assertions(2);

      // check before
      expect(propose.address).toEqual('127.0.0.1:6379');
      // prepration
      propose.address = '49.1.91.33:1234';

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(false);
    });

    it('acceptPropose() - returns false when "generatorPublicKey" property was manipulated', () => {
      expect.assertions(1);

      // prepration
      propose.generatorPublicKey = randomHex(32);

      const accepted = ConsensusBase.acceptPropose(propose);
      expect(accepted).toEqual(false);
    });
  });

  describe('getProposeHash', () => {
    it('getProposeHash() - get hash of propose', () => {
      expect.assertions(2);

      const keypair: KeyPair = {
        publicKey: Buffer.from(
          '137a93f7f0937ab9f100fa053de988363aac710ccda3402fef073cbcb92748b3',
          'hex'
        ),
        privateKey: Buffer.from(
          'f0393febe8baaa55e32f7be2a7cc180bf34e52137d99e056c817a9c07b8f239a137a93f7f0937ab9f100fa053de988363aac710ccda3402fef073cbcb92748b3',
          'hex'
        ),
      };

      const block = createBlock(String(1), keypair);
      block.payloadHash =
        'a3f30f5ad286fd34c19da4663861f3675f48165b4e16c5699266d54bd1950982'; // do not use random values for test

      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      const address = '127.0.0.1:6379';

      const propose = ConsensusBase.createPropose(keypair, block, address);

      // act
      const hash = ConsensusBase.getProposeHash(propose);
      expect(Buffer.isBuffer(hash)).toEqual(true);

      expect(hash.toString('hex')).toEqual(
        '3003acdfc8b55001e40235cb8cb84c84fa7c58cdd65e0bcfaa76934f2c8ebb81'
      );
    });

    it('getProposeHash() - throws if not ip has no colon', () => {
      expect.assertions(1);

      const keypair = createKeypair();
      const block = createBlock(String(1), keypair);
      block.signature = BlockBase.sign(block, keypair);
      block.id = BlockBase.getId(block);
      const address = '127.0.0.1_6379'; // no colon (:)

      const propose = ConsensusBase.createPropose(keypair, block, address);

      // jest can't assert. See: https://github.com/jestjs/jest/issues/7547
      let threw = false;
      try {
        ConsensusBase.getProposeHash(propose);
      } catch (err) {
        threw = true;
      }

      expect(threw).toEqual(true);
    });
  });
});
