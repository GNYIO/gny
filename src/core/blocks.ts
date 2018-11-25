import assert = require('assert');
import crypto = require('crypto');
import async = require('async');
import util = require('util');
import isArray = require('util').isArray;
import BlockStatus from '../utils/block-status';
import Router = require('../utils/router');
import slots = require('../utils/slots');
import sandboxHelper = require('../utils/sandbox');
import addressHelper = require('../utils/address');
import transactionMode = require('../utils/transaction-mode');
import * as constants from '../utils/constants'

export default class Block {
  private modules: any;
  private library: any;
  private genesisBlock: any;
  private lastBlock: any = {};
  private blockStatus = new BlockStatus();
  private isLoaded: boolean = false;
  private isActive: boolean = false;
  private blockCache = {};
  private proposeCache = {};
  private lastPropose = null;
  private isCollectingVotes = false;
  private lastVoteTime: any;

  constructor(scope: any) {
    this.library = scope;
    this.genesisBlock = scope.genesisBlock;
    this.attachAPI();
  }

  private attachAPI() {
    const router = new Router();

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    })

    router.map(this, {
      'get /get': 'getBlock',
      'get /full': 'getFullBlock',
      'get /': 'getBlocks',
      'get /getHeight': 'getHeight',
      'get /getMilestone': 'getMilestone',
      'get /getReward': 'getReward',
      'get /getSupply': 'getSupply',
      'get /getStatus': 'getStatus',
    })

    router.use((req, res) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    })

    this.library.network.app.use('/api/blocks', router)
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next()
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    })
  }

  public async getIdSequence2(height: number) {
    try {
      const maxHeight = Math.max(height, this.lastBlock.height);
      const minHeight = Math.max(0, maxHeight - 4);
      let blocks = await app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
      blocks = blocks.reverse();
      const ids = blocks.map((b: any) => b.id);
      return { ids, firstHeight: minHeight };
    } catch (e) {
      throw e;
    }
  }

  public async getCommonBlock(peer: any, height: number) {
    const lastBlockHeight = height;
  }

  public processBlock = async (b: any, options: any) => {
    if (!this.isLoaded) throw new Error('Blockchain is loading')
  
    let block = b
    app.sdb.beginBlock(block)
  
    if (!block.transactions) block.transactions = []
    if (!options.local) {
      try {
        block = this.library.base.block.objectNormalize(block)
      } catch (e) {
        this.library.logger.error(`Failed to normalize block: ${e}`, block)
        throw e
      }
  
      // TODO sort transactions
      // block.transactions = library.base.block.sortTransactions(block)
      await this.verifyBlock(block, options)
  
      this.library.logger.debug('verify block ok')
      if (block.height !== 0) {
        const exists = (undefined !== await app.sdb.getBlockById(block.id))
        if (exists) throw new Error(`Block already exists: ${block.id}`)
      }
  
      if (block.height !== 0) {
        try {
          await this.modules.delegates.validateBlockSlot(block)
        } catch (e) {
          this.library.logger.error(e)
          throw new Error(`Can't verify slot: ${e}`)
        }
        this.library.logger.debug('verify block slot ok')
      }
  
      // TODO use bloomfilter
      for (const transaction of block.transactions) {
        this.library.base.transaction.objectNormalize(transaction)
      }
      const idList = block.transactions.map(t => t.id)
      if (await app.sdb.exists('Transaction', { id: { $in: idList } })) {
        throw new Error('Block contain already confirmed transaction')
      }
  
      app.logger.trace('before applyBlock')
      try {
        await this.applyBlock(block, options)
      } catch (e) {
        app.logger.error(`Failed to apply block: ${e}`)
        throw e
      }
    }
  
    try {
      this.saveBlockTransactions(block)
      await this.applyRound(block)
      await app.sdb.commitBlock()
      const trsCount = block.transactions.length
      app.logger.info(`Block applied correctly with ${trsCount} transactions`)
      this.setLastBlock(block)
  
      if (options.broadcast) {
        options.votes.signatures = options.votes.signatures.slice(0, 6)
        this.library.bus.message('newBlock', block, options.votes)
      }
      this.library.bus.message('processBlock', block)
    } catch (e) {
      app.logger.error(block)
      app.logger.error('save block error: ', e)
      await app.sdb.rollbackBlock()
      throw new Error(`Failed to save block: ${e}`)
    } finally {
      this.blockCache = {}
      this.proposeCache = {}
      this.lastVoteTime = null
      this.isCollectingVotes = false
      this.library.base.consensus.clearState()
    }
  }

  public applyRound = async (block: any) => {
    if (block.height === 0) {
      this.modules.delegates.updateBookkeeper()
      return
    }
  
    let address = addressHelper.generateNormalAddress(block.delegate)
    app.sdb.increase('Delegate', { producedBlocks: 1 }, { address })
  
    let transFee = 0
    for (const t of block.transactions) {
      if (transactionMode.isDirectMode(t.mode) && t.fee >= 0) {
        transFee += t.fee
      }
    }
  
    const roundNumber = this.modules.round.calc(block.height)
    const { fees, rewards } = this.increaseRoundData({ fees: transFee, rewards: block.reward }, roundNumber)
  
    if (block.height % 101 !== 0) return
  
    app.logger.debug(`----------------------on round ${roundNumber} end-----------------------`)
  
    const delegates = modules.delegates.generateDelegateList(block.height)
    app.logger.debug('delegate length', delegates.length)
  
    const forgedBlocks = await app.sdb.getBlocksByHeightRange(block.height - 100, block.height - 1)
    const forgedDelegates = [...forgedBlocks.map(b => b.delegate), block.delegate]
  
    const missedDelegates = forgedDelegates.filter(fd => !delegates.includes(fd))
    missedDelegates.forEach((md) => {
      address = addressHelper.generateNormalAddress(md)
      app.sdb.increase('Delegate', { missedDelegate: 1 }, { address })
    })
  
    async function updateDelegate(pk, fee, reward) {
      address = addressHelper.generateNormalAddress(pk)
      app.sdb.increase('Delegate', { fees: fee, rewards: reward }, { address })
      // TODO should account be all cached?
      app.sdb.increase('Account', { xas: fee + reward }, { address })
    }
  
    const councilControl = 1
    if (councilControl) {
      const councilAddress = 'GADQ2bozmxjBfYHDQx3uwtpwXmdhafUdkN'
      app.sdb.createOrLoad('Account', { xas: 0, address: councilAddress, name: null })
      app.sdb.increase('Account', { xas: fees + rewards }, { address: councilAddress })
    } else {
      const ratio = 1
  
      const actualFees = Math.floor(fees * ratio)
      const feeAverage = Math.floor(actualFees / delegates.length)
      const feeRemainder = actualFees - (feeAverage * delegates.length)
      // let feeFounds = fees - actualFees
  
      const actualRewards = Math.floor(rewards * ratio)
      const rewardAverage = Math.floor(actualRewards / delegates.length)
      const rewardRemainder = actualRewards - (rewardAverage * delegates.length)
      // let rewardFounds = rewards - actualRewards
  
      for (const fd of forgedDelegates) {
        await updateDelegate(fd, feeAverage, rewardAverage)
      }
      await updateDelegate(block.delegate, feeRemainder, rewardRemainder)
    }
  
    if (block.height % 101 === 0) {
      this.modules.delegates.updateBookkeeper()
    }
  }

  public increaseRoundData = (modifier, roundNumber) => {
    app.sdb.createOrLoad('Round', { fees: 0, rewards: 0, round: roundNumber })
    return app.sdb.increase('Round', modifier, { round: roundNumber })
  }

  public applyBlock = async (block: any) => {
    app.logger.trace('enter applyblock')
    const appliedTransactions: any = {}
  
    try {
      for (const transaction of block.transactions) {
        if (appliedTransactions[transaction.id]) {
          throw new Error(`Duplicate transaction in block: ${transaction.id}`)
        }
        await this.modules.transactions.applyUnconfirmedTransactionAsync(transaction)
        // TODO not just remove, should mark as applied
        // modules.blockchain.transactions.removeUnconfirmedTransaction(transaction.id)
        appliedTransactions[transaction.id] = transaction
      }
    } catch (e) {
      app.logger.error(e)
      await app.sdb.rollbackBlock()
      throw new Error(`Failed to apply block: ${e}`)
    }
  }

  public generateBlock = async (keypair: any, timestamp: any) => {
    if (this.library.base.consensus.hasPendingBlock(timestamp)) {
      return null
    }
    const unconfirmedList = this.modules.transactions.getUnconfirmedTransactionList()
    const payloadHash = crypto.createHash('sha256')
    let payloadLength = 0
    let fees = 0
    for (const transaction of unconfirmedList) {
      fees += transaction.fee
      const bytes = this.library.base.transaction.getBytes(transaction)
      // TODO check payload length when process remote block
      if ((payloadLength + bytes.length) > 8 * 1024 * 1024) {
        throw new Error('Playload length outof range')
      }
      payloadHash.update(bytes)
      payloadLength += bytes.length
    }
    const height = this.lastBlock.height + 1
    const block = {
      version: 0,
      delegate: keypair.publicKey.toString('hex'),
      height,
      prevBlockId: this.lastBlock.id,
      timestamp,
      transactions: unconfirmedList,
      count: unconfirmedList.length,
      fees,
      payloadHash: payloadHash.digest().toString('hex'),
      reward: this.blockStatus.calcReward(height),
    }
  
    block.signature = this.library.base.block.sign(block, keypair)
    block.id = this.library.base.block.getId(block)
  
    let activeKeypairs
    try {
      activeKeypairs = await this.modules.delegates.getActiveDelegateKeypairs(block.height)
    } catch (e) {
      throw new Error(`Failed to get active delegate keypairs: ${e}`)
    }
  
    const id = block.id
    assert(activeKeypairs && activeKeypairs.length > 0, 'Active keypairs should not be empty')
    this.library.logger.info(`get active delegate keypairs len: ${activeKeypairs.length}`)
    const localVotes = this.library.base.consensus.createVotes(activeKeypairs, block)
    if (this.library.base.consensus.hasEnoughVotes(localVotes)) {
      this.modules.transactions.clearUnconfirmed()
      await this.processBlock(block, { local: true, broadcast: true, votes: localVotes })
      this.library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${this.modules.round.calc(height)}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${block.reward}`)
      return null
    }
    if (!this.library.config.publicIp) {
      this.library.logger.error('No public ip')
      return null
    }
    const serverAddr = `${this.library.config.publicIp}:${this.library.config.peerPort}`
    let propose
    try {
      propose = this.library.base.consensus.createPropose(keypair, block, serverAddr)
    } catch (e) {
      this.library.logger.error('Failed to create propose', e)
      return null
    }
    this.library.base.consensus.setPendingBlock(block)
    this.library.base.consensus.addPendingVotes(localVotes)
    // this.proposeCache[propose.hash] = true
    this.isCollectingVotes = true
    this.library.bus.message('newPropose', propose, true)
    return null
  }

  public getLastBlock = () => this.lastBlock

  public saveBlockTransactions = (block: any) => {
    app.logger.trace('Blocks#saveBlockTransactions height', block.height)
    for (const trs of block.transactions) {
      trs.height = block.height
      app.sdb.create('Transaction', trs)
    }
    app.logger.trace('Blocks#save transactions')
  }

  public verifyBlock = async (block: any, options: any) =>{
    try {
      block.id = this.library.base.block.getId(block)
    } catch (e) {
      throw new Error(`Failed to get block id: ${e.toString()}`)
    }
  
    this.library.logger.debug(`verifyBlock, id: ${block.id}, h: ${block.height}`)
  
    if (!block.prevBlockId && block.height !== 0) {
      throw new Error('Previous block should not be null')
    }
  
    try {
      if (!this.library.base.block.verifySignature(block)) {
        throw new Error('Failed to verify block signature')
      }
    } catch (e) {
      this.library.logger.error({ e, block })
      throw new Error(`Got exception while verify block signature: ${e.toString()}`)
    }
  
    if (block.prevBlockId !== this.lastBlock.id) {
      throw new Error('Incorrect previous block hash')
    }
  
    if (block.height !== 0) {
      const blockSlotNumber = slots.getSlotNumber(block.timestamp)
      const lastBlockSlotNumber = slots.getSlotNumber(this.lastBlock.timestamp)
  
      if (blockSlotNumber > slots.getSlotNumber() + 1 || blockSlotNumber <= lastBlockSlotNumber) {
        throw new Error(`Can't verify block timestamp: ${block.id}`)
      }
    }
  
    if (block.transactions.length > constants.maxTxsPerBlock) {
      throw new Error(`Invalid amount of block assets: ${block.id}`)
    }
    if (block.transactions.length !== block.count) {
      throw new Error('Invalid transaction count')
    }
  
    const payloadHash = crypto.createHash('sha256')
    const appliedTransactions: any = {}
  
    let totalFee = 0
    for (const transaction of block.transactions) {
      totalFee += transaction.fee
  
      let bytes
      try {
        bytes = this.library.base.transaction.getBytes(transaction)
      } catch (e) {
        throw new Error(`Failed to get transaction bytes: ${e.toString()}`)
      }
  
      if (appliedTransactions[transaction.id]) {
        throw new Error(`Duplicate transaction id in block ${block.id}`)
      }
  
      appliedTransactions[transaction.id] = transaction
      payloadHash.update(bytes)
    }
  
    if (totalFee !== block.fees) {
      throw new Error('Invalid total fees')
    }
  
    const expectedReward = this.blockStatus.calcReward(block.height)
    if (expectedReward !== block.reward) {
      throw new Error('Invalid block reward')
    }
  
    // HARDCODE_HOT_FIX_BLOCK_6119128
    // if (block.height > 6119128) {
    //   if (payloadHash.digest().toString('hex') !== block.payloadHash) {
    //     throw new Error(`Invalid payload hash: ${block.id}`)
    //   }
    // }
  
    if (options.votes) {
      const votes = options.votes
      if (block.height !== votes.height) {
        throw new Error('Votes height is not correct')
      }
      if (block.id !== votes.id) {
        throw new Error('Votes id is not correct')
      }
      if (!votes.signatures || !this.library.base.consensus.hasEnoughVotesRemote(votes)) {
        throw new Error('Votes signature is not correct')
      }
      await this.verifyBlockVotes(block, votes)
    }
  }

  public verifyBlockVotes = async (block: any, votes: any) => {
    const delegateList = this.modules.delegates.generateDelegateList(block.height)
    const publicKeySet = new Set(delegateList)
    for (const item of votes.signatures) {
      if (!publicKeySet.has(item.key.toString('hex'))) {
        throw new Error(`Votes key is not in the top list: ${item.key}`)
      }
      if (!this.library.base.consensus.verifyVote(votes.height, votes.id, item)) {
        throw new Error('Failed to verify vote signature')
      }
    }
  }

  public setLastBlock = (block: any) => {
    this.lastBlock = block
  }

  // Events
  public onBind = (scope: any) => {
    this.modules = scope

    this.isLoaded = true

    return (async () => {
      try {
        const count = app.sdb.blocksCount
        app.logger.info('Blocks found:', count)
        if (!count) {
          this.setLastBlock({ height: -1 })
          await this.processBlock(this.genesisBlock.block, {})
        } else {
          const block = await app.sdb.getBlockByHeight(count - 1)
          this.setLastBlock(block)
        }
        this.library.bus.message('blockchainReady')
      } catch (e) {
        app.logger.error('Failed to prepare local blockchain', e)
        process.exit(0)
      }
    })()
  }
}
