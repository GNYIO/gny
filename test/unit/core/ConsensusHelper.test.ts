import {
  IBlock,
  KeyPair,
  ManyVotes,
  Transaction,
} from '../../../src/interfaces';
import { ConsensusHelper } from '../../../src/core/ConsensusHelper';
import * as ed from '../../../src/utils/ed';
import * as crypto from 'crypto';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import slots from '../../../src/utils/slots';
import { ConsensusBase } from '../../../src/base/consensus';

function createRandomBlock(height: number = 6, prevBlockId = randomHex(32)) {
  const keyPair = randomKeyPair();
  const timestamp = slots.getSlotNumber(slots.getSlotNumber());
  const lastBlock = {
    id: prevBlockId,
    height: height - 1,
  } as IBlock;
  const unconfirmedTrs: Transaction[] = [];
  const block = BlocksHelper.generateBlockShort(
    keyPair,
    timestamp,
    lastBlock,
    unconfirmedTrs
  );
  return block;
}

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
}

function randomKeyPair() {
  const randomstring = randomHex(32);
  const hash = crypto
    .createHash('sha256')
    .update(randomstring, 'utf8')
    .digest();
  return ed.generateKeyPair(hash);
}

describe('ConsensusHelper', () => {
  describe('addPendingVotes', () => {
    it('addPendingVotes() - returns unchanged state if no pendingBlock is available', done => {
      // preparation
      const state = BlocksHelper.getInitialState();
      expect(state.pendingBlock).toBeUndefined();
      const votes: ManyVotes = {
        height: 1,
        id: randomHex(32),
        signatures: [],
      };

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);
      expect(result).toEqual(state);
      expect(result).not.toBe(state); // returns other object reference

      done();
    });

    it('addPendingVotes() - calling function with votes that have not same block "height" as the pendingBlock are not getting added', done => {
      // preparation block 1
      const block1 = {
        height: 1,
        id: 'id1',
      } as IBlock;
      let state = BlocksHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, block1);

      const keypairs = [randomKeyPair()];

      // create votes for "almost" the same block (with other height)
      const block2 = {
        height: 2,
        id: 'id1',
      } as IBlock;
      const votes = ConsensusBase.createVotes(keypairs, block2);

      // pre check: the pendingBlock.id and votes.id are the same
      expect(state.pendingBlock.id).toEqual(votes.id);
      // pre check: the pendingBlock.height and votes.height are NOT the same
      expect(state.pendingBlock.height).not.toEqual(votes.height);

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);

      // assert that state did not change
      expect(result).toEqual(state);
      expect(result.pendingVotes).toBeUndefined();

      done();
    });

    it.only('addPendingVotes() - calling function with votes that have not the same block "id" as the pendingBlock are not getting added', done => {
      // preparation block 1
      const block1 = {
        height: 1,
        id: 'id1',
      } as IBlock;
      let state = BlocksHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, block1);

      const keypairs = [randomKeyPair()];

      // create votes for "almost" the same block (with other id)
      const block2 = {
        height: 1,
        id: 'id2',
      } as IBlock;
      const votes = ConsensusBase.createVotes(keypairs, block2);

      // pre check: the pendingBlock.id and votes.id are NOT the same
      expect(state.pendingBlock.id).not.toEqual(votes.id);
      // pre check: the pendingBlock.height and votes.height are the same
      expect(state.pendingBlock.height).toEqual(votes.height);

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);

      // assert that state did not change
      expect(result).toEqual(state);
      expect(result.pendingVotes).toBeUndefined();

      done();
    });

    it.skip('addingPendingVotes() - adding twice the same vote from a delegate (publicKey) has no effect on pendingVotes signatures', done => {
      // preparation
    });

    it('addPendingVotes() - adds pendingVotes if no pendingVotes are available yet', done => {
      // prepration, important: first set the pendingBlock
      let state = BlocksHelper.getInitialState();
      const pendingBlock = createRandomBlock(1);
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);
      const keypairs = [randomKeyPair()];

      const pendingVotes = ConsensusBase.createVotes(keypairs, pendingBlock);

      // pre check, currently no pendingVotes
      expect(state.pendingVotes).toBeUndefined();
      // pre check pendingVotes should have 1 signature
      expect(pendingVotes.signatures).toHaveLength(1);

      // act
      const result = ConsensusHelper.addPendingVotes(state, pendingVotes);

      expect(result.pendingVotes).not.toBeUndefined();
      expect(result.pendingVotes.height).toEqual(1);
      expect(result.pendingVotes.id).toEqual(pendingBlock.id);
      expect(result.pendingVotes.signatures).toEqual(pendingVotes.signatures);
      expect(result.pendingVotes.signatures).toHaveLength(1);

      done();
    });

    it('addPendingVotes() - calling addPendingVotes() more then once works', done => {
      // prepration, important: first set the pendingBlock
      let state = BlocksHelper.getInitialState();
      const pendingBlock = createRandomBlock(1);
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      // first act
      const firstKeypairs = [randomKeyPair()];
      const firstVotes = ConsensusBase.createVotes(firstKeypairs, pendingBlock);
      const firstResult = ConsensusHelper.addPendingVotes(state, firstVotes);

      // check after first act
      expect(firstResult.pendingVotes.signatures).toHaveLength(1);

      // second act
      const secondKeypairs = [randomKeyPair()];
      const secondVotes = ConsensusBase.createVotes(
        secondKeypairs,
        pendingBlock
      );
      const result = ConsensusHelper.addPendingVotes(firstResult, secondVotes);

      // check
      expect(result.pendingVotes.signatures).toHaveLength(2);

      done();
    });
  });

  describe.skip('hasPendingBlock', () => {
    it.skip('should return false when remote votes are not enough ', done => {
      const existed = ConsensusBase.hasPendingBlock(timestamp);
      expect(existed).toBeFalsy();
      done();
    });

    it.skip('should return false when remote votes are not enough ', done => {
      ConsensusBase.pendingBlock = block;
      const existed = ConsensusBase.hasPendingBlock(timestamp);
      expect(existed).toBeTruthy();
      done();
    });
  });
});
