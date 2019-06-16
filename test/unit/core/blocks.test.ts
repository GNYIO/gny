import Blocks from '../../../src/core/blocks';
import {
  IScope,
  PeerNode,
  Modules,
  IBlock,
  KeyPair,
  IGenesisBlock,
} from '../../../src/interfaces';
import { BlockBase } from '../../../src/base/block';
import { TransactionBase } from '../../../src/base/transaction';
import { Block as BlockModel } from '../../../packages/database-postgres/entity/Block';
import * as crypto from 'crypto';
import { generateAddress } from '../../../src/utils/address';
import * as ed from '../../../src/utils/ed';
import slots from '../../../src/utils/slots';
import { BlocksHelper } from '../../../src/core/BlocksHelper';
import * as fs from 'fs';
import { SmartDB } from '../../../packages/database-postgres/src/smartDB';
import BalanceManager from '../../../src/smartdb/balance-manager';

function loadGenesisBlock() {
  const genesisBlockRaw = fs.readFileSync('genesisBlock.json', {
    encoding: 'utf8',
  });
  const genesisBlock: IGenesisBlock = JSON.parse(genesisBlockRaw);
  return genesisBlock;
}

function loadRawOrmSqljsConfig() {
  const ormConfigRaw = fs.readFileSync('ormconfig.sqljs.json', {
    encoding: 'utf8',
  });
  return ormConfigRaw;
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
  height: number,
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
        fee: 0,
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
    height: 2,
    prevBlockId: previousBlock.id,
    timestamp: timestamp,
    transactions: transactions,
    count: transactions.length,
    fees: 0,
    payloadHash: payloadHash.digest().toString('hex'),
    reward: 0,
    signature: null,
    id: null,
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

describe.skip('core/blocks', () => {
  let coreBlocks: Blocks;
  beforeAll(done => {
    global.app = {};
    done();
  });
  beforeEach(done => {
    const scope = {} as IScope;
    coreBlocks = new Blocks(scope);
    done();
  });
  afterEach(done => {
    global.app = {};
    coreBlocks = undefined;
    done();
  });

  describe('RunGenesisOrLoadLastBlock()', () => {
    let blocks: Blocks;

    beforeEach(async done => {
      // global
      global.app = {
        sdb: new SmartDB(dummyLogger, {
          configRaw: loadRawOrmSqljsConfig(),
          cachedBlockCount: 10,
          maxBlockHistoryHold: 10,
        }),
      };
      await global.app.sdb.init();
      global.app.balances = new BalanceManager(global.app.sdb);

      const scope = {
        logger: dummyLogger,
      } as IScope;
      blocks = new Blocks(scope);
      blocks.loaded = true; // illegal
      done();
    });

    afterEach(done => {
      // cleanup global
      global.app = {};
      done();
    });

    it('RunGenesisOrLoadLastBlock() - 0 blocks in DB saves genesis Block in db', async done => {
      const state = BlocksHelper.getInitialState();
      const genesisBlock = loadGenesisBlock();

      // TODO: prepare global sdb

      const getBlocksByHeightRange = async (
        height: number
      ): Promise<IBlock> => {
        throw new Error('should not be called');
      };

      const resultState = await blocks.RunGenesisOrLoadLastBlock(
        state,
        0,
        genesisBlock,
        getBlocksByHeightRange
      );
      // does not work because this.modules.transactions is undefined!
      console.log(JSON.stringify(resultState));
      expect(resultState).not.toBeUndefined();
      expect(resultState.lastBlock).not.toBeUndefined();
      expect(resultState.lastBlock.id).toEqual(genesisBlock.id);

      done();
    });

    it.skip('RunGenesisOrLoadLastBlock() - 3 blocks in DB loades latest Block from db', async done => {});
  });

  describe.skip('getCommonBlock()', () => {
    beforeEach(done => {
      global.app = {
        sdb: {
          getBlocksByHeightRange: jest.fn().mockReturnValue([
            {
              id:
                '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
            },
          ]),
        },
      } as any;

      const scope = {
        logger: dummyLogger,
      };
      coreBlocks = new Blocks(scope);

      const modules = {
        peer: {
          request: jest.fn().mockReturnValue({
            common: {
              id:
                '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
            },
          }),
        },
      } as any;
      // coreBlocks.onBind(modules);

      done();
    });

    it('getCommonBlock() - no lastBlock throws error', async () => {
      const peer: PeerNode = {
        host: '0.0.0.0',
        port: 5000,
      };
      const lastBlockHeight = 3;
      const func = coreBlocks.getCommonBlock(peer, lastBlockHeight);
      return expect(func).rejects.toHaveProperty(
        'message',
        "Cannot read property 'height' of undefined"
      );
    });

    it.skip('getCommonBlock() - returns commonBlock from peer', async done => {
      // prepare
      coreBlocks.setLastBlock({
        height: 0,
      });

      const peer: PeerNode = {
        host: '0.0.0.0',
        port: 5000,
      };
      const lastBlockHeight = 0;

      const result = await coreBlocks.getCommonBlock(peer, lastBlockHeight);
      expect(result).toEqual({
        id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
      });

      done();
    });
  });

  describe('getLastBlock()', () => {
    it('getLastBlock() - returns lastBlock', done => {
      coreBlocks.setLastBlock({
        height: -1,
      });

      const result = coreBlocks.getLastBlock();
      expect(result).toEqual({
        height: -1,
      });
      done();
    });

    it('getLastBlock() - returns full block', done => {
      const EXPECTED_BlOCK = {
        id: '28d65b4b694b4b4eee7f26cd8653097078b2e576671ccfc51619baf3f07b1541',
        height: 0,
        fees: 0,
        reward: 0,
        signature:
          'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c',
      };
      coreBlocks.setLastBlock(EXPECTED_BlOCK);

      const result = coreBlocks.getLastBlock();
      expect(result).toEqual(EXPECTED_BlOCK);

      done();
    });
  });

  it('setLastBlock() - sets last block', done => {
    const FIRST = {
      height: -1,
    };
    const SECOND = {
      height: 0,
    };

    coreBlocks.setLastBlock(FIRST);
    coreBlocks.setLastBlock(SECOND);

    const result = coreBlocks.getLastBlock();
    expect(result).toEqual(SECOND);

    done();
  });

  describe('verifyBlock()', () => {
    beforeEach(done => {
      // base.block.getId
      const scope = {
        logger: dummyLogger,
      } as any;
      coreBlocks = new Blocks(scope);

      done();
    });

    it('verifyBlock() - wrong Block can not get Id', async () => {
      const wrongBlock = {} as IBlock;
      const options = {};
      const func = coreBlocks.verifyBlock(wrongBlock, options);
      return expect(func).rejects.toMatchObject({
        message: expect.stringMatching(/^Failed to get block id:/),
      });
    });

    it('verifyBlock() - previousBlock should not be null', async () => {
      const block: BlockModel = {
        height: 1,
        id: randomHex(32),
        _version_: 1,
        count: 0,
        timestamp: 35151242,
        delegate: randomAddress(),
        version: 0,
        fees: 0,
        reward: 0,
        payloadHash: randomHex(32),
        signature: randomHex(64),
      };
      const options = {};
      const func = coreBlocks.verifyBlock(block, options);

      return expect(func).rejects.toHaveProperty(
        'message',
        'Previous block should not be null'
      );
    });

    it.skip('verifyBlock() - signature is not correct returns error', async () => {
      const block: BlockModel = {
        height: 1,
        id: randomHex(32),
        _version_: 1,
        count: 0,
        timestamp: 35151242,
        delegate: randomAddress(),
        version: 0,
        fees: 0,
        reward: 0,
        payloadHash: randomHex(32),
        signature: randomHex(64),
        prevBlockId: randomHex(32), // important
      };
      const options = {};

      const func = coreBlocks.verifyBlock(block, options);
      return expect(func).rejects.toMatchObject({
        message: expect.stringMatching(
          /^Got exception while verify block signature/
        ),
      });
    });

    it.skip('verifyBlock() - Incorrect previous block hash', async () => {});

    it("verifyBlock() - Can't verify block timestamp", async () => {
      const keypair = createRandomKeyPair('random secret');

      // prepare setLastBlock
      const previousBlock = createBlock(1, keypair, {
        prevBlockId: randomHex(32),
      } as IBlock);
      coreBlocks.setLastBlock(previousBlock);

      // act
      const block = createBlock(2, keypair, previousBlock);

      const options = {};
      const func = coreBlocks.verifyBlock(block, options);
      return expect(func).rejects.toMatchObject({
        message: expect.stringMatching(/^Can't verify block timestamp/),
      });
    });

    it('verifyBlock() - Invalid amount of block assets (too much transactions)', async () => {
      // prepare
      const TOO_MUCH_TRANSACTIONS = 20000 + 1;

      const previousBlockId = randomHex(32);
      const keypair = createRandomKeyPair('some random secret');
      const block = createBlock(
        2,
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
      coreBlocks.setLastBlock({
        id: previousBlockId,
        timestamp: lastBlockTimestamp,
      } as any);

      // act
      const options = {};
      const func = coreBlocks.verifyBlock(block, options);

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

  it.skip('isCollectingVotes()', done => {
    done();
  });

  it.skip('event onBind', done => {
    done();
  });
});
