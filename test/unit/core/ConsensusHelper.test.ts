import {
  IBlock,
  ManyVotes,
  ITransaction,
  ILogger,
  ITracer,
} from '@gnyio/interfaces';
import * as ConsensusHelper from '@gnyio/main/consensushelper';
import * as ed from '@gnyio/ed';
import * as crypto from 'crypto';
import * as BlocksHelper from '@gnyio/main/blockshelper';
import { slots } from '@gnyio/utils';
import { ConsensusBase } from '@gnyio/base';
import * as StateHelper from '@gnyio/main/statehelper';
import { ISpan } from '@gnyio/tracer';
import { container, TYPES } from '@gnyio/container';

function createRandomBlock(
  height: string = String(6),
  prevBlockId = randomHex(32)
) {
  const keyPair = randomKeyPair();
  const timestamp = slots.getSlotTime(slots.getSlotNumber());

  const lastBlock = {
    id: prevBlockId,
    height: (Number(height) - 1).toString(),
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
    // @ts-ignore
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

    global.library = {
      logger,
    };

    container.snapshot();
    const mockTracer = ({
      startSpan: () => createSpan(),
    } as unknown) as ITracer;
    container.bind<ITracer>(TYPES.TracerService).toConstantValue(mockTracer);
  });

  afterEach(() => {
    delete global.library;

    container.restore();
  });

  describe('addPendingVotes', () => {
    it('addPendingVotes() - throws if there is no pendingBlock', () => {
      expect.assertions(2);

      // preparation
      const state = StateHelper.getInitialState();
      expect(state.pendingBlock).toBeUndefined();

      const newBlock = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        newBlock
      );

      // act
      const testSpan = createSpan();
      return expect(() =>
        ConsensusHelper.addPendingVotes(state, votes, testSpan)
      ).toThrowError('no pending block');
    });

    it('addPendingVotes() - throws if votes id do not match pendingBlock id', () => {
      expect.assertions(1);

      // preparation
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(3));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );
      const testSpan = createSpan();
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );

      // votes from a peer
      const votes2: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );
      // mess up the votes id (from a peer)
      votes2.id = 'some bad id';

      const testSpan2 = createSpan();
      return expect(() =>
        ConsensusHelper.addPendingVotes(temp, votes2, testSpan2)
      ).toThrowError('votes and block do not match');
    });

    it('addPendingVotes() - throws if votes height do not match pendingBlock height', () => {
      expect.assertions(1);

      // preparation
      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(3));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );
      const testSpan = createSpan();
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );

      // votes from a peer
      const votes2: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );
      // mess up the votes height (from a peer)
      votes2.height = String(9);

      const testSpan2 = createSpan();
      return expect(() =>
        ConsensusHelper.addPendingVotes(temp, votes2, testSpan2)
      ).toThrowError('votes and block do not match');
    });

    it('addingPendingVotes() - throws if any signature is wrong', () => {
      expect.assertions(1);

      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(3));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );

      const spanTest = createSpan();
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      // create votes with wrong signatures
      const votes2: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair()],
        createRandomBlock(String(5))
      );
      votes2.id = votes.id; // only the signatures should be wrong for this test
      votes2.height = votes.height; // only the signatures should be wrong for this test

      const spanTest2 = createSpan();
      return expect(() =>
        ConsensusHelper.addPendingVotes(temp, votes2, spanTest2)
      ).toThrowError('not all signatures are valid');
    });
  });

  describe('createPendingBlockAndVotes', () => {
    it('createPendingBlockAndVotes() - sets pendingBlock and pendingVotes', () => {
      expect.assertions(10);

      const state = StateHelper.getInitialState();
      const newBlock = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        newBlock
      );

      expect(votes.height).toEqual(String(1));
      expect(votes.id).toEqual(newBlock.id);
      expect(votes.signatures).toHaveLength(1);

      const testSpan = createSpan();
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
    });

    it('createPendingBlockAndVotes() - throws when one wrong signature is passed in', () => {
      expect.assertions(1);

      // create ManyVotes that have wrong signature
      const block = createRandomBlock(String(3));
      const votes = ConsensusBase.createVotes(
        [randomKeyPair()],
        createRandomBlock(String(2))
      );
      votes.height = block.height;
      votes.id = block.id;

      const state = StateHelper.getInitialState();
      const testSpan = createSpan();
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
      expect.assertions(1);

      const block = createRandomBlock(String(2));
      // votes without signatures
      const votes: ManyVotes = {
        id: block.id,
        height: block.height,
        signatures: [],
      };

      const state = StateHelper.getInitialState();
      const testSpan = createSpan();

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
      expect.assertions(1);

      const block = createRandomBlock(String(5));
      const votes = ConsensusBase.createVotes([randomKeyPair()], block);
      // mess up votes.id
      votes.id = 'wrong id';

      const testSpan = createSpan();
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
    it('hasPendingBlock() - returns false if state has no pendingBlock', () => {
      expect.assertions(1);

      const state = StateHelper.getInitialState();
      const timestamp = Date.now();

      const result = ConsensusHelper.hasPendingBlock(state, timestamp);

      expect(result).toEqual(false);
    });

    it('hasPendingBlock() - returns true if state has pendingBlock and currentTimestamp are in the same slot', () => {
      expect.assertions(2);

      // preparation
      let state = StateHelper.getInitialState();
      const block = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair()],
        block
      );

      // make test not brittle, block.timestamp and currentTimestamp should be the same
      const nowInEpochTime = slots.getEpochTime(undefined);
      block.timestamp = nowInEpochTime;

      // set pending block
      const testSpan = createSpan();
      state = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );

      // pre check
      expect(state.pendingBlock.timestamp).toEqual(nowInEpochTime);

      // act
      const result = ConsensusHelper.hasPendingBlock(state, nowInEpochTime);
      expect(result).toEqual(true);
    });

    it('hasPendingBlock() - returns false if timestamp of pendingBlock was 10 seconds before current timestamp', () => {
      expect.assertions(3);

      let state = StateHelper.getInitialState();
      const block = createRandomBlock(String(1));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );

      // make test not brittle, block.timestamp and currentTimestamp should originate from same timestamp
      // pendingBlock.timestamp is 10 seconds before "nowInEpochTime" variable
      const currentTimestamp = Date.now();
      const oldTimestamp = currentTimestamp - 10000;

      const currentEpochTime = slots.getEpochTime(currentTimestamp);
      const oldEpochTime = slots.getEpochTime(oldTimestamp);

      block.timestamp = oldEpochTime; // pendingBlock was 10 seconds before

      // pre check
      const slot1 = slots.getSlotNumber(currentEpochTime);
      const slot2 = slots.getSlotNumber(block.timestamp);
      expect(slot1).toEqual(slot2 + 1);

      // prepare state
      const testSpan = createSpan();
      state = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        testSpan
      );
      // pre check: state has pendingBlock
      expect(state.pendingBlock).not.toBeUndefined();

      // act
      const result = ConsensusHelper.hasPendingBlock(state, currentEpochTime);

      expect(result).toEqual(false);
    });
  });

  describe('getPendingBlock', () => {
    it('getPendingBlock() - returns no pendingBlock if there is not one', () => {
      expect.assertions(1);

      const state = StateHelper.getInitialState();

      const result = ConsensusHelper.getPendingBlock(state);
      expect(result).toBeUndefined();
    });

    it('getPendingBlock() - returns pendingblock if there is one', () => {
      expect.assertions(1);

      const state = StateHelper.getInitialState();
      const block = createRandomBlock(String(2));
      const votes: ManyVotes = ConsensusBase.createVotes(
        [randomKeyPair()],
        block
      );

      const spanTest = createSpan();
      const tempState = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      const result = ConsensusHelper.getPendingBlock(tempState);
      expect(result).toEqual(block);
    });
  });

  describe('clearState', () => {
    it('clearState() - resets pendingBlock, pendingVotes and votesKeySet', () => {
      expect.assertions(7);

      // preparation
      const state = StateHelper.getInitialState();

      // set pendingBlock
      const block = createRandomBlock(String(1));
      const votes = ConsensusBase.createVotes(
        [randomKeyPair(), randomKeyPair(), randomKeyPair()],
        block
      );
      const spanTest = createSpan();
      const temp = ConsensusHelper.createPendingBlockAndVotes(
        state,
        block,
        votes,
        spanTest
      );

      // pre check
      expect(temp.pendingBlock).not.toBeUndefined();
      expect(temp.pendingVotes).not.toBeUndefined();
      expect(temp.pendingVotes.signatures).toHaveLength(3);
      expect(Object.keys(temp.votesKeySet).length).toEqual(3);

      // act
      const result = ConsensusHelper.clearState(temp);

      // after check
      expect(result.pendingBlock).toBeUndefined();
      expect(result.pendingVotes).toBeUndefined();
      expect(Object.keys(result.votesKeySet).length).toEqual(0);
    });

    describe('CollectingVotes', () => {
      it('CollectingVotes() - set the privIsCollectingVotes prop to true', () => {
        expect.assertions(3);

        const state = StateHelper.getInitialState();

        // pre check
        expect(state.privIsCollectingVotes).toEqual(false);

        const result = ConsensusHelper.CollectingVotes(state);

        expect(result.privIsCollectingVotes).toEqual(true);
        expect(result).not.toBe(state); // returned state is is other object reference
      });
    });
  });
});
