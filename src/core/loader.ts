import * as Router from '../utils/router';
import * as slots from '../utils/slots';
import * as constants from '../utils/constants';

export default class Loader {
  private isLoaded: boolean = false;
  private isSynced: boolean = false;
  private library: any;
  private modules: any;
  private genesisBlock: any;
  private syncIntervalId: any;
  
  constructor(scope: any) {
    this.library = scope;
    this.genesisBlock = this.library.genesisblock;
  }

  syncTrigger(turnOn: boolean) {
    if (turnOn === false && this.syncIntervalId) {
      clearTimeout(priv.syncIntervalId)
      priv.syncIntervalId = null
    }
    if (turnOn === true && !priv.syncIntervalId) {
      setImmediate(function nextSyncTrigger() {
        library.network.io.sockets.emit('loader/sync', {
          blocks: priv.blocksToSync,
          height: modules.blocks.getLastBlock().height,
        })
        priv.syncIntervalId = setTimeout(nextSyncTrigger, 1000)
      })
    }
  }

  private async loadFullDatabase(peer: any) {
    const commonBlockId = this.genesisBlock.block.id
    this.library.logger.debug(`Start loading blocks from ${peer.host}:${peer.port - 1} from genesis block`);
    await this.modules.blocks.loadBlocksFromPeer(peer, commonBlockId)
  }

  private async findUpdate(lastBlock, peer) {
    this.library.logger.info(`Looking for common block with peer ${peer.host}:${peer.port - 1}`);
    let commonBlock = await this.modules.blocks.getCommonBlock(peer, lastBlock.height);


  }

  priv.findUpdate = (lastBlock, peer, cb) => {
    const peerStr = `${peer.host}:${peer.port - 1}`
  
    
  
    modules.blocks.getCommonBlock(peer, lastBlock.height, (err, commonBlock) => {
      if (err || !commonBlock) {
        library.logger.error('Failed to get common block:', err)
        return cb()
      }
  
      library.logger.info(`Found common block ${commonBlock.id} (at ${commonBlock.height})
        with peer ${peerStr}, last block height is ${lastBlock.height}`)
      const toRemove = lastBlock.height - commonBlock.height
  
      if (toRemove >= 5) {
        library.logger.error(`long fork with peer ${peerStr}`)
        return cb()
      }
  
      return (async () => {
        try {
          modules.transactions.clearUnconfirmed()
          if (toRemove > 0) {
            await app.sdb.rollbackBlock(commonBlock.height)
            modules.blocks.setLastBlock(app.sdb.lastBlock)
            library.logger.debug('set new last block', app.sdb.lastBlock)
          } else {
            await app.sdb.rollbackBlock()
          }
        } catch (e) {
          library.logger.error('Failed to rollback block', e)
          return cb()
        }
        library.logger.debug(`Loading blocks from peer ${peerStr}`)
        return modules.blocks.loadBlocksFromPeer(peer, commonBlock.id, (err2) => {
          if (err) {
            library.logger.error(`Failed to load blocks, ban 60 min: ${peerStr}`, err2)
          }
          cb()
        })
      })()
    })
  }

  private async loadBlocks(lastBlock) {
    modules.peer.randomRequest('getHeight', {}, (err, ret, peer) => {
      if (err) {
        library.logger.error('Failed to request form random peer', err)
        return cb()
      }
  
      const peerStr = `${peer.host}:${peer.port - 1}`
      library.logger.info(`Check blockchain on ${peerStr}`)
  
      ret.height = Number.parseInt(ret.height, 10)
  
      const report = library.scheme.validate(ret, {
        type: 'object',
        properties: {
          height: {
            type: 'integer',
            minimum: 0,
          },
        },
        required: ['height'],
      })
  
      if (!report) {
        library.logger.info(`Failed to parse blockchain height: ${peerStr}\n${library.scheme.getLastError()}`)
        return cb()
      }
  
      if (app.util.bignumber(lastBlock.height).lt(ret.height)) {
        priv.blocksToSync = ret.height
  
        if (lastBlock.id !== priv.genesisBlock.block.id) {
          return priv.findUpdate(lastBlock, peer, cb)
        }
        return priv.loadFullDb(peer, cb)
      }
      return cb()
    })
  }

  private async loadUnconfirmedTransactions() {
    modules.peer.randomRequest('getUnconfirmedTransactions', {}, (err, data, peer) => {
      if (err) {
        return cb()
      }
  
      const report = library.scheme.validate(data.body, {
        type: 'object',
        properties: {
          transactions: {
            type: 'array',
            uniqueItems: true,
          },
        },
        required: ['transactions'],
      })
  
      if (!report) {
        return cb()
      }
  
      const transactions = data.body.transactions
      const peerStr = `${peer.host}:${peer.port - 1}`
  
      for (let i = 0; i < transactions.length; i++) {
        try {
          transactions[i] = library.base.transaction.objectNormalize(transactions[i])
        } catch (e) {
          library.logger.info(`Transaction ${transactions[i] ? transactions[i].id : 'null'} is not valid, ban 60 min`, peerStr)
          return cb()
        }
      }
  
      const trs = []
      for (let i = 0; i < transactions.length; ++i) {
        if (!modules.transactions.hasUnconfirmed(transactions[i])) {
          trs.push(transactions[i])
        }
      }
      library.logger.info(`Loading ${transactions.length} unconfirmed transaction from peer ${peerStr}`)
      return library.sequence.add((done) => {
        modules.transactions.processUnconfirmedTransactions(trs, done)
      }, cb)
    })
  }

  startSyncBlocks() {
    library.logger.debug('startSyncBlocks enter')
    if (!priv.loaded || self.syncing()) {
      library.logger.debug('blockchain is already syncing')
      return
    }
    library.sequence.add((cb) => {
      library.logger.debug('startSyncBlocks enter sequence')
      priv.syncing = true
      const lastBlock = modules.blocks.getLastBlock()
      priv.loadBlocks(lastBlock, (err) => {
        if (err) {
          library.logger.error('loadBlocks error:', err)
        }
        priv.syncing = false
        priv.blocksToSync = 0
        library.logger.debug('startSyncBlocks end')
        cb()
      })
    })
  }

 syncBlocksFromPeer(peer) {
    library.logger.debug('syncBlocksFromPeer enter')
    if (!priv.loaded || self.syncing()) {
      library.logger.debug('blockchain is already syncing')
      return
    }
    library.sequence.add((cb) => {
      library.logger.debug('syncBlocksFromPeer enter sequence')
      priv.syncing = true
      const lastBlock = modules.blocks.getLastBlock()
      modules.transactions.clearUnconfirmed()
      app.sdb.rollbackBlock().then(() => {
        modules.blocks.loadBlocksFromPeer(peer, lastBlock.id, (err) => {
          if (err) {
            library.logger.error('syncBlocksFromPeer error:', err)
          }
          priv.syncing = false
          library.logger.debug('syncBlocksFromPeer end')
          cb()
        })
      })
    })
  }

  onPeerReady() {
    setImmediate(function nextSync() {
      const lastBlock = modules.blocks.getLastBlock()
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp)
      if (slots.getNextSlot() - lastSlot >= 3) {
        self.startSyncBlocks()
      }
      // // setTimeout(nextSync, 10 * 1000)
      // setTimeout(nextSync, 15 * 1000)
      setTimeout(nextSync, constants.interval * 1000)
    })
  
    setImmediate(() => {
      if (!priv.loaded || self.syncing()) return
      priv.loadUnconfirmedTransactions((err) => {
        if (err) {
          library.logger.error('loadUnconfirmedTransactions timer:', err)
        }
      })
    })
  }

  onBind(scope) {
    modules = scope
  }
  
  onBlockchainReady() {
    priv.loaded = true
  }
  
  Loader.prototype.cleanup = (cb) => {
    priv.loaded = false
  }

  shared.status = (req, cb) => {
    cb(null, {
      loaded: priv.loaded,
      now: priv.loadingLastBlock.height,
      blocksCount: priv.total,
    })
  }
  
  sync() {
    return {
      syncing: self.syncing(),
      blocks: priv.blocksToSync,
      height: modules.blocks.getLastBlock().height,
    }
  }
}
