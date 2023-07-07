import { jest } from '@jest/globals';

import Blocks from '@gny/main/blocks';
import { IBlock, KeyPair, ProcessBlockOptions } from '@gny/interfaces';
import { IState, IStateSuccess } from '@gny/main/globalInterfaces';
import { BlockBase } from '@gny/base';
import { TransactionBase } from '@gny/base';
import { Block as BlockModel } from '@gny/database-postgres';
import * as crypto from 'crypto';
import { generateAddress } from '@gny/utils';
import * as ed from '@gny/ed';
import { slots } from '@gny/utils';
import { BlocksHelper } from '@gny/main/blockshelper';
import { StateHelper } from '@gny/main/statehelper';
import { ISpan } from '@gny/tracer';
import { getConfig } from '@gny/network';

function loadGenesisBlock() {
  return getConfig('localnet').genesisBlock;
}

function randomHex(length: number) {
  return crypto.randomBytes(length).toString('hex');
}

function randomAddress() {
  return generateAddress(randomHex(32));
}

function createRandomKeyPair(secret: string) {
  const buffer = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(buffer);
  return keypair;
}

function createBlock(
  height: string,
  keypair: KeyPair,
  previousBlock: IBlock,
  transactionsAmount = 0
) {
  const payloadHash = crypto.createHash('sha256');

  const transactions = [];
  if (transactionsAmount > 0) {
    for (let i = 0; i < transactionsAmount; ++i) {
      const trans = TransactionBase.create({
        // @ts-ignore
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        fee: String(0),
        type: 0,
        args: [generateAddress(randomHex(32)), 2 * 1e8],
        message: undefined,
        keypair,
      });
      // @ts-ignore
      transactions.push(trans);
    }

    for (const trans of transactions) {
      const bytes = TransactionBase.getBytes(trans);
      payloadHash.update(bytes);
    }
  }

  const timestamp = slots.getSlotTime(slots.getSlotNumber());

  const block: IBlock = {
    version: 0,
    delegate: keypair.publicKey.toString('hex'),
    height: String(2),
    prevBlockId: previousBlock.id,
    timestamp: timestamp,
    transactions: transactions,
    count: transactions.length,
    fees: String(0),
    payloadHash: payloadHash.digest().toString('hex'),
    reward: String(0),
    signature: undefined,
    id: undefined,
  };

  block.signature = BlockBase.sign(block, keypair);
  block.id = BlockBase.getId(block);

  return block;
}

const dummyLogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

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

describe('core/blocks', () => {
  beforeEach(done => {
    const tracer = {
      startSpan: () => createSpan(),
    };

    global.app = {
      logger: dummyLogger,
    };
    global.library = {
      // @ts-ignore
      tracer,
    };
    done();
  });
  afterEach(done => {
    global.app = {};
    global.library = {};
    done();
  });

  describe('RunGenesisOrLoadLastBlock()', () => {
    it('RunGenesisOrLoadLastBlock() - 0 blocks in DB processes genesisBlock and saves it in DB', async () => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();

      const getBlocksByHeightRangeFunc = async (
        height: string
      ): Promise<IBlock> => {
        throw new Error('should not be called');
      };

      const expectedState = {
        success: true,
        state: {
          lastBlock: genesisBlock as IBlock,
        },
      } as IStateSuccess;
      const processBlockMock: jest.Mock<any> = jest
        .fn()
        .mockImplementation(() => Promise.resolve(expectedState));

      const resultState = await Blocks.RunGenesisOrLoadLastBlock(
        state,
        String(0),
        genesisBlock as IBlock,
        processBlockMock,
        getBlocksByHeightRangeFunc
      );

      expect(processBlockMock).toBeCalledTimes(1);
      expect(resultState).not.toBeUndefined();
      expect(resultState.lastBlock).not.toBeUndefined();
      expect(resultState.lastBlock.id).toEqual(genesisBlock.id);
      expect(resultState).not.toBe(state); // other object reference
    });

    it('RunGenesisOrLoadLastBlock() - 3 blocks in DB loades latest Block from db', async () => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();

      const processBlockFunc = (
        state: IState,
        block: any,
        options: ProcessBlockOptions,
        delegateList: string[]
      ) => Promise.reject('should not get called');

      // TODO
      const expected = {
        height: String(9),
        id: 'nine',
      } as IBlock;
      const getBlocksByHeightMock: jest.Mock<
        any
      > = jest.fn().mockImplementation(() => Promise.resolve(expected));

      const BLOCK_IN_DB = String(10);
      const resultState = await Blocks.RunGenesisOrLoadLastBlock(
        state,
        BLOCK_IN_DB,
        genesisBlock as IBlock,
        processBlockFunc,
        getBlocksByHeightMock
      );

      expect(resultState).not.toBeUndefined();
      expect(resultState.lastBlock).not.toBeUndefined();
      expect(resultState.lastBlock.height).toEqual(String(9));
      expect(resultState.lastBlock.id).toEqual('nine');
      expect(resultState).not.toBe(state); // other object reference
    });
  });

  describe.skip('verifyBlock()', () => {
    beforeEach(done => {
      global.app = {
        logger: dummyLogger,
      };
      done();
    });
    afterEach(done => {
      global.app = {};
      done();
    });

    it('verifyBlock() - wrong Block can not get Id', () => {
      const initialState = StateHelper.getInitialState();
      const wrongBlock = {} as IBlock;
      const options = {};
      const delegateList = [];

      // act and assert
      return expect(() =>
        Blocks.verifyBlock(initialState, wrongBlock, options, delegateList)
      ).toThrow(/^Failed to get block id:/);
    });

    it('verifyBlock() - previousBlock should not be null', async () => {
      const initialState = StateHelper.getInitialState();
      // important: no "prevBlockId"
      const block: IBlock = {
        height: String(1),
        id: randomHex(32),
        _version_: 1,
        count: 0,
        timestamp: 35151242,
        delegate: randomAddress(),
        version: 0,
        fees: String(0),
        reward: String(0),
        payloadHash: randomHex(32),
        signature: randomHex(64),
      };
      const options = {};
      const delegateList = [];

      // act and assert
      return expect(() =>
        Blocks.verifyBlock(initialState, block, options, delegateList)
      ).toThrow('Previous block should not be null');
    });

    it('verifyBlock() - signature is not correct returns error', () => {
      const state = StateHelper.getInitialState();
      const block: BlockModel = {
        height: String(1),
        id: randomHex(32),
        _version_: 1,
        count: 0,
        timestamp: 35151242,
        delegate: randomAddress(),
        version: 0,
        fees: String(0),
        reward: String(0),
        payloadHash: randomHex(32),
        signature: randomHex(64),
        prevBlockId: randomHex(32), // important
      };
      const options = {};
      const delegateList = [];

      return expect(() =>
        Blocks.verifyBlock(state, block, options, delegateList)
      ).toThrow('Failed to verify block signature');
    });

    it.skip('verifyBlock() - Incorrect previous block hash', () => {});

    it.skip("verifyBlock() - Can't verify block timestamp", () => {
      const keypair = createRandomKeyPair('random secret');
      let state = StateHelper.getInitialState();
      const delegateList = [];
      const options = {};

      // prepare setLastBlock
      const previousBlock = createBlock(String(1), keypair, {
        prevBlockId: randomHex(32),
      } as IBlock);
      // set previousBlock also for state
      state = BlocksHelper.SetLastBlock(state, previousBlock);

      // create current block
      const block = createBlock(String(2), keypair, previousBlock);

      // act and assert
      return expect(() =>
        Blocks.verifyBlock(state, block, options, delegateList)
      ).toThrow(/^Can't verify block timestamp/);
    });

    it('verifyBlock() - Invalid amount of block assets (too much transactions)', () => {
      // prepare
      const TOO_MUCH_TRANSACTIONS = 20000 + 1;

      const previousBlockId = randomHex(32);
      const keypair = createRandomKeyPair('some random secret');
      const block = createBlock(
        String(2),
        keypair,
        {
          id: previousBlockId,
        } as IBlock,
        TOO_MUCH_TRANSACTIONS
      );

      expect(block).toHaveProperty('count', TOO_MUCH_TRANSACTIONS);
      // @ts-ignore
      expect(block.transactions.length).toEqual(TOO_MUCH_TRANSACTIONS);

      // prepare lastBlock
      const lastBlockTimestamp = slots.getSlotTime(slots.getSlotNumber()) - 1;
      // act
      const options = {};
      // @ts-expect-error
      const func = Blocks.verifyBlock(block, options);

      return expect(func).rejects.toMatchObject({
        message: expect.stringMatching(/^Invalid amount of block assets/),
      });
    });
  });

  it.skip('verifyBlockVotes', async () => {});

  it.skip('applyBlock', async () => {});

  it.skip('saveBlockTransactions', async () => {});

  it.skip('increaseRoundData', async () => {});

  it.skip('getBlocks', async () => {});

  it.skip('loadBlocksFromPeer()', async () => {});

  it.skip('generateBlock()', async () => {});

  it.skip('event onReceiveBlock()', () => {});

  it.skip('event onReceivePropose()', () => {});

  it.skip('event onReceiveVotes', async () => {});

  it.skip('event onBind', () => {});
});
