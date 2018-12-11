import * as assert from 'assert';
import * as crypto from 'crypto';
import async = require('async');
import PIFY = require('pify')
import { isArray } from 'util';
import * as constants from '../utils/constants'
import BlockStatus from '../utils/block-status';
import Router from '../utils/router';
import Slots from '../utils/slots';
import addressHelper = require('../utils/address');
import transactionMode from '../utils/transaction-mode';
import { Modules, IScope } from '../interfaces';

const slots = new Slots()

export default class Blocks {
  private genesisBlock: any;
  private modules: Modules;
  private readonly library: IScope;

  private lastBlock: any = {};
  private blockStatus = new BlockStatus();
  private loaded: boolean = false;
  private isActive: boolean = false;
  private blockCache = {};
  private proposeCache = {};
  private lastPropose = null;
  private privIsCollectingVotes = false;

  private lastVoteTime: any;

  constructor(scope: IScope) {
    this.library = scope;
    this.genesisBlock = scope.genesisBlock;
    this.attachAPI();
  }

  // priv methods
  private attachAPI() {
    const router1 = new Router();
    const router = router1.router;

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    })

    router.map(this.shared, {
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
      let blocks = await global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight);
      blocks = blocks.reverse();
      const ids = blocks.map((b: any) => b.id);
      return { ids, firstHeight: minHeight };
    } catch (e) {
      throw e;
    }
  }

  // public toAPIV1Blocks = (blocks) => {
  //   if (blocks && isArray(blocks) && blocks.length > 0) {
  //     return blocks.map(b => self.toAPIV1Block(b))
  //   }
  //   return []
  // }

  public toAPIV1Block = (block) => {
    if (!block) return undefined
    return {
      id: block.id,
      version: block.version,
      timestamp: block.timestamp,
      height: Number(block.height),
      payloadHash: block.payloadHash,
      previousBlock: block.prevBlockId,
      numberOfTransactions: block.count,
      totalFee: block.fees,
      generatorPublicKey: block.delegate,
      blockSignature: block.signature,
      confirmations: this.getLastBlock().height - block.height,
      transactions: !block.transactions ? undefined : this.modules.transactions.toAPIV1Transactions(block.transactions.filter(t => t.executed), block),
  
      // "generatorId":  => missing
      // "totalAmount" => missing
      // "reward" => missing
      // "payloadLength" => missing
      // "totalForged" => missing
    }
  }

  // todo look at core/loader
  public getCommonBlock = async (peer, height) => {
    const lastBlockHeight = height
  
    let data
    try {
      data = await this.getIdSequence2(lastBlockHeight)
    } catch(e) {
      return (`Failed to get lthis.ast block id sequence${e}`)
    }

    this.library.logger.trace('getIdSequence=========', data)
    const params = {
      max: lastBlockHeight,
      min: data.firstHeight,
      ids: data.ids,
    }
    debugger
    let [err2, ret] = await PIFY(this.modules.peer.request)('commonBlock', params, peer)

    if (err2 || ret.error) {
      return (err2 || ret.error.toString())
    }

    if (!ret.common) {
      return 'Common block not found'
    }

    return ret.common
  }

  // duplicate
  public getBlock = (filter, cb) => {
    this.shared.getBlock({ body: filter }, cb)
  }

  public setLastBlock = (block: any) => {
    this.lastBlock = block
  }

  public getLastBlock = () => this.lastBlock

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
    // is this working??
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

  public applyBlock = async (block: any) => {
   global.app.logger.trace('enter applyblock')
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
     global.app.logger.error(e)
      await global.app.sdb.rollbackBlock()
      throw new Error(`Failed to apply block: ${e}`)
    }
  }

  public processBlock = async (b: any, options: any) => {
    if (!this.loaded) throw new Error('Blockchain is loading')
  
    let block = b
    global.app.sdb.beginBlock(block)
  
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
        const exists = (undefined !== await global.app.sdb.getBlockById(block.id))
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
      if (await global.app.sdb.exists('Transaction', { id: { $in: idList } })) {
        throw new Error('Block contain already confirmed transaction')
      }
  
     global.app.logger.trace('before applyBlock')
      try {
        await this.applyBlock(block, options)
      } catch (e) {
       global.app.logger.error(`Failed to apply block: ${e}`)
        throw e
      }
    }
  
    try {
      this.saveBlockTransactions(block)
      await this.applyRound(block)
      await global.app.sdb.commitBlock()
      const trsCount = block.transactions.length
     global.app.logger.info(`Block applied correctly with ${trsCount} transactions`)
      this.setLastBlock(block)
  
      if (options.broadcast) {
        options.votes.signatures = options.votes.signatures.slice(0, 6)
        this.library.bus.message('newBlock', block, options.votes)
      }
      this.library.bus.message('processBlock', block)
    } catch (e) {
     global.app.logger.error(block)
     global.app.logger.error('save block error: ', e)
      await global.app.sdb.rollbackBlock()
      throw new Error(`Failed to save block: ${e}`)
    } finally {
      this.blockCache = {}
      this.proposeCache = {}
      this.lastVoteTime = null
      this.privIsCollectingVotes = false
      this.library.base.consensus.clearState()
    }
  }

  public saveBlockTransactions = (block: any) => {
   global.app.logger.trace('Blocks#saveBlockTransactions height', block.height)
    for (const trs of block.transactions) {
      trs.height = block.height
      global.app.sdb.create('Transaction', trs)
    }
   global.app.logger.trace('Blocks#save transactions')
  }


  public increaseRoundData = (modifier, roundNumber) => {
    global.app.sdb.createOrLoad('Round', { fee: 0, reward: 0, round: roundNumber })
    return global.app.sdb.increase('Round', modifier, { round: roundNumber })
  }

  public applyRound = async (block: any) => {
    if (block.height === 0) {
      this.modules.delegates.updateBookkeeper()
      return
    }
  
    let address = addressHelper.generateAddress(block.delegate)
    global.app.sdb.increase('Delegate', { producedBlocks: 1 }, { address })
  
    let transFee = 0
    for (const t of block.transactions) {
      if (transactionMode.isDirectMode(t.mode) && t.fee >= 0) {
        transFee += t.fee
      }
    }
  
    const roundNumber = this.modules.round.calculateRound(block.height)
    const { fee, reward } = this.increaseRoundData({ fee: transFee, reward: block.reward }, roundNumber)
  
    if (block.height % 101 !== 0) return
  
   global.app.logger.debug(`----------------------on round ${roundNumber} end-----------------------`)
  
    const delegates = this.modules.delegates.generateDelegateList(block.height)
   global.app.logger.debug('delegate length', delegates.length)
  
    const forgedBlocks = await global.app.sdb.getBlocksByHeightRange(block.height - 100, block.height - 1)
    const forgedDelegates = [...forgedBlocks.map(b => b.delegate), block.delegate]
  
    const missedDelegates = forgedDelegates.filter(fd => !delegates.includes(fd))
    missedDelegates.forEach((md) => {
      address = addressHelper.generateAddress(md)
      global.app.sdb.increase('Delegate', { missedDelegate: 1 }, { address })
    })
  
    async function updateDelegate(pk, fee, reward) {
      address = addressHelper.generateAddress(pk)
      global.app.sdb.increase('Delegate', { fees: fee, rewards: reward }, { address })
      // TODO should account be all cached?
      global.app.sdb.increase('Account', { gny: fee + reward }, { address })
    }
  
    const councilControl = 1
    if (councilControl) {
      const councilAddress = 'GADQ2bozmxjBfYHDQx3uwtpwXmdhafUdkN'
      global.app.sdb.createOrLoad('Account', { gny: 0, address: councilAddress, name: null })
      global.app.sdb.increase('Account', { gny: fees + rewards }, { address: councilAddress })
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

  public getBlocks = async (minHeight, maxHeight, withTransaction) => {
    const blocks = await global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight)
  
    if (!blocks || !blocks.length) {
      return []
    }
  
    maxHeight = blocks[blocks.length - 1].height
    if (withTransaction) {
      const transactions = await global.app.sdb.findAll('Transaction', {
        condition: {
          height: { $gte: minHeight, $lte: maxHeight },
        },
      })
      const firstHeight = blocks[0].height
      for (const t of transactions) {
        const h = t.height
        const b = blocks[h - firstHeight]
        if (b) {
          if (!b.transactions) {
            b.transactions = []
          }
          b.transactions.push(t)
        }
      }
    }
  
    return blocks
  }
  
  public loadBlocksFromPeer = (peer, id, cb) => {
    let loaded = false
    let count = 0
    let lastValidBlock = null
    let lastCommonBlockId = id
    async.whilst(
      () => !loaded && count < 30,
      (next) => {
        count++
        const limit = 200
        const params = {
          limit,
          lastBlockId: lastCommonBlockId,
        }
        this.modules.peer.request('blocks', params, peer, (err, body) => {
          if (err) {
            return next(`Failed to request remote peer: ${err}`)
          }
          if (!body) {
            return next('Invalid response for blocks request')
          }
          const blocks = body.blocks
          if (!isArray(blocks) || blocks.length === 0) {
            loaded = true
            return next()
          }
          const num = isArray(blocks) ? blocks.length : 0
          const address = `${peer.host}:${peer.port - 1}`
          library.logger.info(`Loading ${num} blocks from ${address}`)
          return (async () => {
            try {
              for (const block of blocks) {
                await self.processBlock(block, { syncing: true })
                lastCommonBlockId = block.id
                lastValidBlock = block
                library.logger.info(`Block ${block.id} loaded from ${address} at`, block.height)
              }
              return next()
            } catch (e) {
              library.logger.error('Failed to process synced block', e)
              return cb(e)
            }
          })()
        })
      },
      (err) => {
        if (err) {
          library.logger.error('load blocks from remote peer error:', err)
        }
        setImmediate(cb, err, lastValidBlock)
      },
    )
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
  
    block.signature = this.library.base.block.sign(block, keypair.privateKey)
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
      this.library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${this.modules.round.calculateRound(height)}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${block.reward}`)
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
    this.privIsCollectingVotes = true
    this.library.bus.message('newPropose', propose, true)
    return null
  }

  // Events
  public onReceiveBlock = (block: any, votes: any) => {
  if (this.modules.loader.syncing() || !this.loaded) {
    return
  }

  if (this.blockCache[block.id]) {
    return
  }
  this.blockCache[block.id] = true

  this.library.sequence.add((cb) => {
    if (block.prevBlockId === this.lastBlock.id && this.lastBlock.height + 1 === block.height) {
      this.library.logger.info(`Received new block id: ${block.id}` +
        ` height: ${block.height}` +
        ` round: ${this.modules.round.calculateRound(this.modules.blocks.getLastBlock().height)}` +
        ` slot: ${slots.getSlotNumber(block.timestamp)}`)
      return (async () => {
        const pendingTrsMap = new Map()
        try {
          const pendingTrs = this.modules.transactions.getUnconfirmedTransactionList()
          for (const t of pendingTrs) {
            pendingTrsMap.set(t.id, t)
          }
          this.modules.transactions.clearUnconfirmed()
          await global.app.sdb.rollbackBlock()
          await this.processBlock(block, { votes, broadcast: true })
        } catch (e) {
          this.library.logger.error('Failed to process received block', e)
        } finally {
          for (const t of block.transactions) {
            pendingTrsMap.delete(t.id)
          }
          try {
            const redoTransactions = [...pendingTrsMap.values()]
            await this.modules.transactions.processUnconfirmedTransactionsAsync(redoTransactions)
          } catch (e) {
            this.library.logger.error('Failed to redo unconfirmed transactions', e)
          }
          cb()
        }
      })()
    } if (block.prevBlockId !== this.lastBlock.id
      && this.lastBlock.height + 1 === block.height) {
      this.modules.delegates.fork(block, 1)
      return cb('Fork')
    } if (block.prevBlockId === this.lastBlock.prevBlockId
      && block.height === this.lastBlock.height
      && block.id !== this.lastBlock.id) {
      this.modules.delegates.fork(block, 5)
      return cb('Fork')
    } if (block.height > this.lastBlock.height + 1) {
      this.library.logger.info(`receive discontinuous block height ${block.height}`)
      this.modules.loader.startSyncBlocks()
      return cb()
    }
    return cb()
  })
}

public onReceivePropose = (propose: any) => {
  if (this.modules.loader.syncing() || !this.loaded) {
    return
  }
  if (this.proposeCache[propose.hash]) {
    return
  }
  this.proposeCache[propose.hash] = true

  this.library.sequence.add((cb) => {
    if (this.lastPropose && this.lastPropose.height === propose.height
      && this.lastPropose.generatorPublicKey === propose.generatorPublicKey
      && this.lastPropose.id !== propose.id) {
        this.library.logger.warn(`generate different block with the same height, generator: ${propose.generatorPublicKey}`)
      return setImmediate(cb)
    }
    if (propose.height !== this.lastBlock.height + 1) {
      this.library.logger.debug('invalid propose height', propose)
      if (propose.height > this.lastBlock.height + 1) {
        this.library.logger.info(`receive discontinuous propose height ${propose.height}`)
        this.modules.loader.startSyncBlocks()
      }
      return setImmediate(cb)
    }
    if (this.lastVoteTime && Date.now() - this.lastVoteTime < 5 * 1000) {
      this.library.logger.debug('ignore the frequently propose')
      return setImmediate(cb)
    }
    this.library.logger.info(`receive propose height ${propose.height} bid ${propose.id}`)
    return async.waterfall([
      (next) => {
        this.modules.delegates.validateProposeSlot(propose, (err) => {
          if (err) {
            next(`Failed to validate propose slot: ${err}`)
          } else {
            next()
          }
        })
      },
      (next) => {
        this.library.base.consensus.acceptPropose(propose, (err) => {
          if (err) {
            next(`Failed to accept propose: ${err}`)
          } else {
            next()
          }
        })
      },
      (next) => {
        this.modules.delegates.getActiveDelegateKeypairs(propose.height, (err, activeKeypairs) => {
          if (err) {
            next(`Failed to get active keypairs: ${err}`)
          } else {
            next(null, activeKeypairs)
          }
        })
      },
      (activeKeypairs: any, next: any) => {
        if (activeKeypairs && activeKeypairs.length > 0) {
          const votes = this.library.base.consensus.createVotes(activeKeypairs, propose)
          this.library.logger.debug(`send votes height ${votes.height} id ${votes.id} sigatures ${votes.signatures.length}`)
          this.modules.transport.sendVotes(votes, propose.address)
          this.lastVoteTime = Date.now()
          this.lastPropose = propose
        }
        setImmediate(next)
      },
    ], (err: any) => {
      if (err) {
        this.library.logger.error(`onReceivePropose error: ${err}`)
      }
      this.library.logger.debug('onReceivePropose finished')
      cb()
    })
  })
}

public onReceiveVotes = (votes: any) => {
  if (this.modules.loader.syncing() || !this.loaded) {
    return
  }
  this.library.sequence.add((cb) => {
    const totalVotes = this.library.base.consensus.addPendingVotes(votes)
    if (totalVotes && totalVotes.signatures) {
      this.library.logger.debug(`receive new votes, total votes number ${totalVotes.signatures.length}`)
    }
    if (this.library.base.consensus.hasEnoughVotes(totalVotes)) {
      const block = this.library.base.consensus.getPendingBlock()
      const height = block.height
      const id = block.id
      return (async () => {
        try {
          this.modules.transactions.clearUnconfirmed()
          await this.processBlock(block, { votes: totalVotes, local: true, broadcast: true })
          this.library.logger.info(`Forged new block id: ${id}, height: ${height}, round: ${this.modules.round.calculateRound(height)}, slot: ${slots.getSlotNumber(block.timestamp)}, reward: ${block.reward}`)
        } catch (err) {
          this.library.logger.error(`Failed to process confirmed block height: ${height} id: ${id} error: ${err}`)
        }
        cb() 
      })()
    }
    return setImmediate(cb)
  })
}

public getSupply = () => {
  const height = this.lastBlock.height
  return this.blockStatus.calcSupply(height)
}

public getCirculatingSupply = () => {
  const height = this.lastBlock.height
  return this.blockStatus.calcSupply(height)
}

public isCollectingVotes = () => this.privIsCollectingVotes

public isHealthy = () => {
  const lastBlock = this.lastBlock
  const lastSlot = slots.getSlotNumber(lastBlock.timestamp)
  return slots.getNextSlot() - lastSlot < 3 && !this.modules.loader.syncing()
}



  cleanup = (cb) => {
    this.library.logger.debug('Cleaning up core/blocks')
    this.loaded = false
    cb()
  }

  // Shared
  private shared = {

    getBlock: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const query = req.body
      return library.scheme.validate(query, {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
          },
          height: {
            type: 'integer',
            minimum: 0,
          },
        },
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }

        return (async () => {
          try {
            let block
            if (query.id) {
              block = await global.app.sdb.getBlockById(query.id)
            } else if (query.height !== undefined) {
              block = await global.app.sdb.getBlockByHeight(query.height)
            }

            if (!block) {
              return cb('Block not found')
            }
            return cb(null, { block: this.toAPIV1Block(block) })
          } catch (e) {
            this.library.logger.error(e)
            return cb('Server error')
          }
        })()
      })
    },

    getFullBlock: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const query = req.body
      return this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
          },
          height: {
            type: 'integer',
            minimum: 0,
          },
        },
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }

        return (async () => {
          try {
            let block
            if (query.id) {
              block = await global.app.sdb.getBlockById(query.id)
            } else if (query.height !== undefined) {
              block = await global.app.sdb.getBlockByHeight(query.height)
            }
            if (!block) return cb('Block not found')

            const v1Block = this.toAPIV1Block(block)
            return this.modules.transactions.getBlockTransactionsForV1(v1Block, (error, transactions) => {
              if (error) return cb(error)
              v1Block.transactions = transactions
              v1Block.numberOfTransactions = isArray(transactions) ? transactions.length : 0
              return cb(null, { block: v1Block })
            })
          } catch (e) {
            this.library.logger.error('Failed to find block', e)
            return cb(`Server error : ${e.message}`)
          }
        })()
      })
    },

    getBlocks: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const query = req.body
      return this.library.scheme.validate(query, {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          offset: {
            type: 'integer',
            minimum: 0,
          },
          generatorPublicKey: {
            type: 'string',
            format: 'publicKey',
          },
        },
      }, (err) => {
        if (err) {
          return cb(err[0].message)
        }

        return (async () => {
          try {
            const offset = query.offset ? Number(query.offset) : 0
            const limit = query.limit ? Number(query.limit) : 20
            let minHeight
            let maxHeight
            if (query.orderBy === 'height:desc') {
              maxHeight = this.lastBlock.height - offset
              minHeight = (maxHeight - limit) + 1
            } else {
              minHeight = offset
              maxHeight = (offset + limit) - 1
            }

            // TODO: get by delegate ??
            // if (query.generatorPublicKey) {
            //   condition.delegate = query.generatorPublicKey
            // }
            const count = global.app.sdb.blocksCount
            if (!count) throw new Error('Failed to get blocks count')

            const blocks = await global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight)
            if (!blocks || !blocks.length) return cb('No blocks')
            return cb(null, { count, blocks: this.toAPIV1Blocks(blocks) })
          } catch (e) {
            this.library.logger.error('Failed to find blocks', e)
            return cb('Server error')
          }
        })()
      })
    },

    getHeight: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      return cb(null, { height: this.lastBlock.height })
    },

    getMilestone: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const height = this.lastBlock.height
      return cb(null, { milestone: this.blockStatus.calcMilestone(height) })
    },

    getReward: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const height = this.lastBlock.height
      return cb(null, { reward: this.blockStatus.calcReward(height) })
    },

    getSupply: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const height = this.lastBlock.height
      return cb(null, { supply: this.blockStatus.calcSupply(height) })
    },

    getStatus: (req, cb) => {
      if (!this.loaded) {
        return cb('Blockchain is loading')
      }
      const height = this.lastBlock.height
      return cb(null, {
        height,
        fee: this.library.base.block.calculateFee(),
        milestone: this.blockStatus.calcMilestone(height),
        reward: this.blockStatus.calcReward(height),
        supply: this.blockStatus.calcSupply(height),
      })
    }
  }
  // end Shared

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope

    this.loaded = true

    return (async () => {
      try {
        const count = global.app.sdb.blocksCount
       global.app.logger.info('Blocks found:', count)
        if (!count) {
          this.setLastBlock({ height: -1 })
          await this.processBlock(this.genesisBlock.block, {})
        } else {
          const block = await global.app.sdb.getBlockByHeight(count - 1)
          this.setLastBlock(block)
        }
        this.library.bus.message('blockchainReady')
      } catch (e) {
       global.app.logger.error('Failed to prepare local blockchain', e)
        process.exit(0)
      }
    })()
  }
}
