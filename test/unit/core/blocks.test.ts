import Blocks from '../../../packages/main/src/core/blocks';
import {
  IBlock,
  KeyPair,
  ProcessBlockOptions,
} from '../../../packages/interfaces';
import { IState } from '../../../packages/main/src/globalInterfaces';
import { BlockBase } from '../../../packages/base/src/blockBase';
import { TransactionBase } from '../../../packages/base/src/transactionBase';
import { Block as BlockModel } from '../../../packages/database-postgres/entity/Block';
import * as crypto from 'crypto';
import { generateAddress } from '../../../packages/utils/src/address';
import * as ed from '../../../packages/ed';
import { slots } from '../../../packages/utils/src/slots';
import { BlocksHelper } from '../../../packages/main/src/core/BlocksHelper';
import * as fs from 'fs';
import { StateHelper } from '../../../packages/main/src/core/StateHelper';

function loadGenesisBlock() {
  const genesisBlockRaw = fs.readFileSync('genesisBlock.json', {
    encoding: 'utf8',
  });
  const genesisBlock: IBlock = JSON.parse(genesisBlockRaw);
  return genesisBlock;
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
        secret:
          'grow pencil ten junk bomb right describe trade rich valid tuna service',
        fee: String(0),
        type: 0,
        args: [generateAddress(randomHex(32)), 2 * 1e8],
        message: null,
        keypair,
      });
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

describe('core/blocks', () => {
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

  describe('RunGenesisOrLoadLastBlock()', () => {
    it('RunGenesisOrLoadLastBlock() - 0 blocks in DB processes genesisBlock and saves it in DB', async done => {
      const state = StateHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();

      const getBlocksByHeightRangeFunc = async (
        height: string
      ): Promise<IBlock> => {
        throw new Error('should not be called');
      };

      const expectedState = {
        lastBlock: genesisBlock as IBlock,
      } as IState;
      const processBlockMock = jest
        .fn()
        .mockImplementation(() => Promise.resolve(expectedState));

      const resultState = await Blocks.RunGenesisOrLoadLastBlock(
        state,
        String(0),
        genesisBlock,
        processBlockMock,
        getBlocksByHeightRangeFunc
      );

      expect(processBlockMock).toBeCalledTimes(1);
      expect(resultState).not.toBeUndefined();
      expect(resultState.lastBlock).not.toBeUndefined();
      expect(resultState.lastBlock.id).toEqual(genesisBlock.id);
      expect(resultState).not.toBe(state); // other object reference

      done();
    });

    it('RunGenesisOrLoadLastBlock() - 3 blocks in DB loades latest Block from db', async done => {
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
      const getBlocksByHeightMock = jest
        .fn()
        .mockImplementation(() => Promise.resolve(expected));

      const BLOCK_IN_DB = String(10);
      const resultState = await Blocks.RunGenesisOrLoadLastBlock(
        state,
        BLOCK_IN_DB,
        genesisBlock,
        processBlockFunc,
        getBlocksByHeightMock
      );

      expect(resultState).not.toBeUndefined();
      expect(resultState.lastBlock).not.toBeUndefined();
      expect(resultState.lastBlock.height).toEqual(String(9));
      expect(resultState.lastBlock.id).toEqual('nine');
      expect(resultState).not.toBe(state); // other object reference

      done();
    });
  });

  describe('getIdSequence2', () => {
    it('getIdSequence2() - returns the 4 last blockIds in descending order (happy path)', async done => {
      const currentLastBlockHeight = String(59);

      const blocksAscending = [
        {
          height: String(55),
          id: 'fivefive',
        },
        {
          height: String(56),
          id: 'fivesix',
        },
        {
          height: String(57),
          id: 'fiveseven',
        },
        {
          height: String(58),
          id: 'fiveeight',
        },
        {
          height: String(59),
          id: 'fivenine',
        },
      ] as IBlock[];
      const getBlocksByHeightRange = jest
        .fn()
        .mockImplementation(() => Promise.resolve(blocksAscending));

      // act
      const result = await Blocks.getIdSequence2(
        currentLastBlockHeight,
        getBlocksByHeightRange
      );

      expect(result).toHaveProperty('min', String(55));
      expect(result).toHaveProperty('max', String(59));
      expect(result).toHaveProperty('ids', [
        'fivenine',
        'fiveeight',
        'fiveseven',
        'fivesix',
        'fivefive',
      ]);

      done();
    });

    it('getIdSequence2() - throws Error with "getIdSequence2 failed" if something goes wrong', async () => {
      // preparation
      const currentLastBlockHeight = String(30);

      const getBlocksByHeightRangeMock = jest
        .fn()
        .mockImplementation(() => Promise.reject('something wrong happend'));

      // act
      const resultPromise = Blocks.getIdSequence2(
        currentLastBlockHeight,
        getBlocksByHeightRangeMock
      );

      return expect(resultPromise).rejects.toHaveProperty(
        'message',
        'getIdSequence2 failed'
      );
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
      expect(block.transactions.length).toEqual(TOO_MUCH_TRANSACTIONS);

      // prepare lastBlock
      const lastBlockTimestamp = slots.getSlotTime(slots.getSlotNumber()) - 1;
      // act
      const options = {};
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

  it.skip('applyRound', async () => {});

  it.skip('getBlocks', async () => {});

  it.skip('loadBlocksFromPeer()', async () => {});

  it.skip('generateBlock()', async () => {});

  it.skip('event onReceiveBlock()', done => {
    done();
  });

  it.skip('event onReceivePropose()', done => {
    done();
  });

  it.skip('event onReceiveVotes', async () => {});

  it.skip('event onBind', done => {
    done();
  });
});
