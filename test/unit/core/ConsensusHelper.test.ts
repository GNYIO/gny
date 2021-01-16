import {
  IBlock,
  ManyVotes,
  ITransaction,
  ILogger,
} from '../../../packages/interfaces';
import { ConsensusHelper } from '../../../packages/main/src/core/ConsensusHelper';
import * as ed from '../../../packages/ed';
import * as crypto from 'crypto';
import { BlocksHelper } from '../../../packages/main/src/core/BlocksHelper';
import { slots } from '../../../packages/utils/src/slots';
import { ConsensusBase } from '../../../packages/base/src/consensusBase';
import { StateHelper } from '../../../packages/main/src/core/StateHelper';
import { BigNumber } from 'bignumber.js';
import { ISpan } from '../../../packages/tracer/dist';

function createRandomBlock(
  height: string = String(6),
  prevBlockId = randomHex(32)
) {
  const keyPair = randomKeyPair();
  const timestamp = slots.getSlotTime(slots.getSlotNumber());

  const lastBlock = {
    id: prevBlockId,
    height: new BigNumber(height).minus(1).toFixed(),
  } as IBlock;
  const unconfirmedTrs: ITransaction[] = [];
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

function createSpan(): ISpan {
  const val: ISpan = {
    context: () => {},
    finish: () => null,
    log: () => null,
    setTag: () => null,
  };
  return val;
}

describe('ConsensusHelper', () => {
  beforeEach(() => {
    const logger: ILogger = {
      log: x => x,
      trace: x => x,
      debug: x => x,
      info: x => x,
      warn: x => x,
      error: x => x,
      fatal: x => x,
    };

    const tracer = {
      startSpan: () => createSpan(),
    };

    global.library = {
      logger,
      tracer,
    };
  });

  afterEach(() => {
    delete global.library;
  });

  describe('addPendingVotes', () => {
    // not good
    it.skip('addPendingVotes() - returns unchanged state if no pendingBlock is available', done => {
      // preparation
      const state = StateHelper.getInitialState();
      expect(state.pendingBlock).toBeUndefined();
      const votes: ManyVotes = {
        height: String(1),
        id: randomHex(32),
        signatures: [],
      };

      // act
      const result = ConsensusHelper.addPendingVotes(state, votes);
      expect(result).toEqual(state);
      expect(result).not.toBe(state); // returns other object reference

      done();
    });

    // not good
    it.skip('addPendingVotes() - calling function with votes that have not same block "height" as the pendingBlock are not getting added', done => {
      // preparation block 1
      const block1 = {
        height: String(1),
        id: 'id1',
      } as IBlock;
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, block1);

      const keypairs = [randomKeyPair()];

      // create votes for "almost" the same block (with other height)
      const block2 = {
        height: String(2),
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

    // not good
    it.skip('addPendingVotes() - calling function with votes that have not the same block "id" as the pendingBlock are not getting added', done => {
      // preparation block 1
      const block1 = {
        height: String(1),
        id: 'id1',
      } as IBlock;
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, block1);

      const keypairs = [randomKeyPair()];

      // create votes for "almost" the same block (with other id)
      const block2 = {
        height: String(1),
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

    // skip
    it.skip('addingPendingVotes() - adding twice the same vote from a delegate (publicKey) has no effect on pendingVotes signatures', done => {
      // preparation
      const pendingBlock = createRandomBlock(String(1));
      let state = StateHelper.getInitialState();
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      const keypairs = [randomKeyPair()];
      const votes = ConsensusBase.createVotes(keypairs, pendingBlock);

      // first add
      state = ConsensusHelper.addPendingVotes(state, votes);

      // check state
      expect(state.pendingVotes.signatures).toHaveLength(1);

      // second add (with exact same votes)
      const result = ConsensusHelper.addPendingVotes(state, votes);

      expect(result.pendingVotes.signatures).toHaveLength(1);

      done();
    });

    it('addPendingVotes() - adds pendingVotes if no pendingVotes are available yet', done => {
      // prepration, important: first set the pendingBlock
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));
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
      expect(result.pendingVotes.height).toEqual(String(1));
      expect(result.pendingVotes.id).toEqual(pendingBlock.id);
      expect(result.pendingVotes.signatures).toEqual(pendingVotes.signatures);
      expect(result.pendingVotes.signatures).toHaveLength(1);

      done();
    });

    it('addPendingVotes() - calling addPendingVotes() more then once works', done => {
      // prepration, important: first set the pendingBlock
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));
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

  describe.skip('createPendingBlockAndVotes', () => {
    it('createPendingBlockAndVotes() - sets pendingBlock and pendingVotes', done => {
      const state = StateHelper.getInitialState();
      const newBlock = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        newBlock
      );

      expect(votes.height).toEqual(String(1));
      expect(votes.id).toEqual(newBlock.id);
      expect(votes.signatures).toHaveLength(1);

      const testSpan = global.library.tracer.startSpan('test');
      const result = ConsensusHelper.createPendingBlockAndVotes(
        state,
        newBlock,
        votes,
        testSpan
      );

      expect(result).not.toBe(state); // other object reference gets returned

      expect(result.pendingBlock).toEqual(newBlock);
      expect(result.pendingVotes).toEqual(votes);

      expect(result.pendingBlock.id).toEqual(newBlock.id);
      expect(result.pendingBlock.height).toEqual(newBlock.height);

      expect(result.pendingVotes.id).toEqual(votes.id);
      expect(result.pendingVotes.height).toEqual(votes.height);

      randomKeyPair;
      return done();
    });

    it('createPendingBlockAndVotes() - throws when one wrong signature is passed in', () => {
      // create ManyVotes that have wrong signature
      const block = createRandomBlock(String(3));
      const votes = ConsensusBase.createVotes(
        [randomKeyPair()],
        createRandomBlock(String(2))
      );
      votes.height = block.height;
      votes.id = block.id;

      const state = StateHelper.getInitialState();
      const testSpan = global.library.tracer.startSpan('test');
      return expect(() =>
        ConsensusHelper.createPendingBlockAndVotes(
          state,
          block,
          votes,
          testSpan
        )
      ).toThrowError('not all signatures are valid');
    });

    it('createPendingBlockAndVotes() - throw if not at least one correct vote gets passed in', () => {
      const block = createRandomBlock(String(2));
      // votes without signatures
      const votes: ManyVotes = {
        id: block.id,
        height: block.height,
        signatures: [],
      };

      const state = StateHelper.getInitialState();
      const testSpan = global.library.tracer.startSpan('test');

      return expect(() =>
        ConsensusHelper.createPendingBlockAndVotes(
          state,
          block,
          votes,
          testSpan
        )
      ).toThrowError('no signatures passed in');
    });

    it('createPendingBlockAndVotes() - throws if votes id is different than block id', () => {
      const block = createRandomBlock(String(5));
      const votes = ConsensusBase.createVotes([randomKeyPair()], block);
      // mess up votes.id
      votes.id = 'wrong id';

      const testSpan = global.library.tracer.startSpan('test');
      const state = StateHelper.getInitialState();

      return expect(() =>
        ConsensusHelper.createPendingBlockAndVotes(
          state,
          block,
          votes,
          testSpan
        )
      ).toThrowError('block and votes not the same');
    });
  });

  describe('hasPendingBlock', () => {
    it('hasPendingBlock() - returns false if state has no pendingBlock', done => {
      const state = StateHelper.getInitialState();
      const timestamp = Date.now();

      const result = ConsensusHelper.hasPendingBlock(state, timestamp);

      expect(result).toEqual(false);

      done();
    });

    it('hasPendingBlock() - returns true if state has pendingBlock and currentTimestamp are in the same slot', done => {
      // preparation
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));

      // make test not brittle, block.timestamp and currentTimestamp should be the same
      const nowInEpochTime = slots.getEpochTime(undefined);
      pendingBlock.timestamp = nowInEpochTime;
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      // pre check
      expect(state.pendingBlock.timestamp).toEqual(nowInEpochTime);

      // act
      const result = ConsensusHelper.hasPendingBlock(state, nowInEpochTime);
      expect(result).toEqual(true);

      done();
    });

    it('hasPendingBlock() - returns false if timestamp of pendingBlock was 10 seconds before current timestamp', done => {
      let state = StateHelper.getInitialState();
      const pendingBlock = createRandomBlock(String(1));

      // make test not brittle, block.timestamp and currentTimestamp should originate from same timestamp
      // pendingBlock.timestamp is 10 seconds before "nowInEpochTime" variable
      const currentTimestamp = Date.now();
      const oldTimestamp = currentTimestamp - 10000;

      const currentEpochTime = slots.getEpochTime(currentTimestamp);
      const oldEpochTime = slots.getEpochTime(oldTimestamp);

      pendingBlock.timestamp = oldEpochTime; // pendingBlock was 10 seconds before

      // pre check
      const slot1 = slots.getSlotNumber(currentEpochTime);
      const slot2 = slots.getSlotNumber(pendingBlock.timestamp);
      expect(slot1).toEqual(slot2 + 1);

      // prepare state
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);
      // pre check: state has pendingBlock
      expect(state.pendingBlock).not.toBeUndefined();

      // act
      const result = ConsensusHelper.hasPendingBlock(state, currentEpochTime);

      expect(result).toEqual(false);
      done();
    });
  });

  describe('getPendingBlock', () => {
    it('getPendingBlock() - returns no pendingBlock if there is not one', done => {
      const state = StateHelper.getInitialState();

      const result = ConsensusHelper.getPendingBlock(state);
      expect(result).toBeUndefined();

      done();
    });

    it('getPendingBlock() - returns pendingblock if there is one', done => {
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(2));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );

      const spanTest = global.library.tracer.startSpan('test');
      const tempState = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      const result = ConsensusHelper.getPendingBlock(tempState);
      expect(result).toEqual(block);

      done();
    });
  });

  describe('clearState', () => {
    it.only('clearState() - resets pendingBlock, pendingVotes and votesKeySet', done => {
      // preparation
      let state = StateHelper.getInitialState();

      // set pendingBlock
      const pendingBlock = createRandomBlock(String(1));
      state = ConsensusHelper.setPendingBlock(state, pendingBlock);

      // add pendingVotes
      const keypairs = [randomKeyPair(), randomKeyPair(), randomKeyPair()];
      const pendingVotes = ConsensusBase.createVotes(keypairs, pendingBlock);
      state = ConsensusHelper.addPendingVotes(
        state,
        pendingVotes,
        createSpan()
      );

      // pre check
      expect(state.pendingBlock).not.toBeUndefined();
      expect(state.pendingVotes).not.toBeUndefined();
      expect(state.pendingVotes.signatures).toHaveLength(3);
      expect(Object.keys(state.votesKeySet).length).toEqual(3);

      // act
      const result = ConsensusHelper.clearState(state);

      // after check
      expect(result.pendingBlock).toBeUndefined();
      expect(result.pendingVotes).toBeUndefined();
      expect(Object.keys(result.votesKeySet).length).toEqual(0);

      done();
    });

    describe('CollectingVotes', () => {
      it('CollectingVotes() - set the privIsCollectingVotes prop to true', done => {
        const state = StateHelper.getInitialState();

        // pre check
        expect(state.privIsCollectingVotes).toEqual(false);

        const result = ConsensusHelper.CollectingVotes(state);

        expect(result.privIsCollectingVotes).toEqual(true);
        expect(result).not.toBe(state); // returned state is is other object reference

        done();
      });
    });
  });
});
