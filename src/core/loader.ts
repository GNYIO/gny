import * as slots from '../utils/slots';
import * as constants from '../utils/constants';

export default class Loader {
  private isLoaded: boolean = false;
  private isSynced: boolean = false;
  private library: any;
  private modules: any;
  private genesisBlock: any;
  private syncIntervalId: any;
  private blocksToSync: any;
  
  constructor(scope: any) {
    this.library = scope;
    this.genesisBlock = this.library.genesisBlock;
  }

  syncTrigger(turnOn: boolean) {
    if (turnOn === false && this.syncIntervalId) {
      clearTimeout(this.syncIntervalId)
      this.syncIntervalId = null
    }
    if (turnOn === true && !this.syncIntervalId) {
      let nextSyncTrigger = () => {
        this.library.network.io.sockets.emit('loader/sync', {
          blocks: this.blocksToSync,
          height: this.modules.blocks.getLastBlock().height,
        })
        this.syncIntervalId = setTimeout(nextSyncTrigger, 1000)
      }
      setImmediate(nextSyncTrigger)
    }
  }

  private async loadFullDatabase(peer: any) {
    const commonBlockId = this.genesisBlock.block.id
    this.library.logger.debug(`Start loading blocks from ${peer.host}:${peer.port - 1} from genesis block`);
    await this.modules.blocks.loadBlocksFromPeer(peer, commonBlockId)
  }

  // private async findUpdate(lastBlock: any, peer: any) {
  //   this.library.logger.info(`Looking for common block with peer ${peer.host}:${peer.port - 1}`);
  //   let commonBlock = await this.modules.blocks.getCommonBlock(peer, lastBlock.height);
  // }

  private findUpdate(lastBlock: any, peer: any, cb: any) {
    const peerStr = `${peer.host}:${peer.port - 1}`
  
    this.modules.blocks.getCommonBlock(peer, lastBlock.height, (err, commonBlock) => {
      if (err || !commonBlock) {
        this.library.logger.error('Failed to get common block:', err)
        return cb()
      }
  
      this.library.logger.info(`Found common block ${commonBlock.id} (at ${commonBlock.height})
        with peer ${peerStr}, last block height is ${lastBlock.height}`)
      const toRemove = lastBlock.height - commonBlock.height
  
      if (toRemove >= 5) {
        this.library.logger.error(`long fork with peer ${peerStr}`)
        return cb()
      }
  
      return (async () => {
        try {
          this.modules.transactions.clearUnconfirmed()
          if (toRemove > 0) {
            await app.sdb.rollbackBlock(commonBlock.height)
            this.modules.blocks.setLastBlock(app.sdb.lastBlock)
            this.library.logger.debug('set new last block', app.sdb.lastBlock)
          } else {
            await app.sdb.rollbackBlock()
          }
        } catch (e) {
          this.library.logger.error('Failed to rollback block', e)
          return cb()
        }
        this.library.logger.debug(`Loading blocks from peer ${peerStr}`)
        return this.modules.blocks.loadBlocksFromPeer(peer, commonBlock.id, (err2) => {
          if (err) {
            this.library.logger.error(`Failed to load blocks, ban 60 min: ${peerStr}`, err2)
          }
          cb()
        })
      })()
    })
  }

  private async loadBlocks(lastBlock: any, cb: any) {
    this.modules.peer.randomRequest('getHeight', {}, (err, ret, peer) => {
      if (err) {
        this.library.logger.error('Failed to request form random peer', err)
      }

      const peerStr = `${peer.host}:${peer.port - 1}`
      this.library.logger.info(`Check blockchain on ${peerStr}`)
  
      ret.height = Number.parseInt(ret.height, 10)
  
      const report = this.library.scheme.validate(ret, {
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
        this.library.logger.info(`Failed to parse blockchain height: ${peerStr}\n${this.library.scheme.getLastError()}`)
      }
  
      if (app.util.bignumber(lastBlock.height).lt(ret.height)) {
        this.blocksToSync = ret.height

        if (lastBlock.id !== this.genesisBlock.block.id) {
          return this.findUpdate(lastBlock, peer, cb)
        }
        // return this.loadFullDb(peer, cb)
      }
      return cb()
    })
  }

  private async loadUnconfirmedTransactions() {
    this.modules.peer.randomRequest('getUnconfirmedTransactions', {}, (err, data, peer) => {
      if (err) {
        return null
      }
  
      const report = this.library.scheme.validate(data.body, {
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
        return null
      }
  
      const transactions = data.body.transactions
      const peerStr = `${peer.host}:${peer.port - 1}`
  
      for (let i = 0; i < transactions.length; i++) {
        try {
          transactions[i] = this.library.base.transaction.objectNormalize(transactions[i])
        } catch (e) {
          this.library.logger.info(`Transaction ${transactions[i] ? transactions[i].id : 'null'} is not valid, ban 60 min`, peerStr)
          return null
        }
      }
  
      const trs: any[] = []
      for (let i = 0; i < transactions.length; ++i) {
        if (!this.modules.transactions.hasUnconfirmed(transactions[i])) {
          trs.push(transactions[i])
        }
      }
      this.library.logger.info(`Loading ${transactions.length} unconfirmed transaction from peer ${peerStr}`)
      return this.library.sequence.add((done: any) => {
        this.modules.transactions.processUnconfirmedTransactions(trs, done)
      }, cb)
    })
  }

  startSyncBlocks() {
    this.library.logger.debug('startSyncBlocks enter')
    if (!this.isLoaded || this.isSynced) {
      this.library.logger.debug('blockchain is already syncing')
      return
    }
    this.library.sequence.add((cb) => {
      this.library.logger.debug('startSyncBlocks enter sequence')
      this.isSynced = true
      const lastBlock = this.modules.blocks.getLastBlock()
      this.loadBlocks(lastBlock, (err) => {
        if (err) {
          this.library.logger.error('loadBlocks error:', err)
        }
        this.isSynced = false
        this.blocksToSync = 0
        this.library.logger.debug('startSyncBlocks end')
        cb()
      })
    })
  }

 syncBlocksFromPeer(peer) {
    this.library.logger.debug('syncBlocksFromPeer enter')
    if (!this.isLoaded || this.isSynced) {
      this.library.logger.debug('blockchain is already syncing')
      return
    }
    this.library.sequence.add((cb) => {
      this.library.logger.debug('syncBlocksFromPeer enter sequence')
      this.isSynced = true
      const lastBlock = this.modules.blocks.getLastBlock()
      this.modules.transactions.clearUnconfirmed()
      app.sdb.rollbackBlock().then(() => {
        this.modules.blocks.loadBlocksFromPeer(peer, lastBlock.id, (err) => {
          if (err) {
            this.library.logger.error('syncBlocksFromPeer error:', err)
          }
          this.isSynced = false
          this.library.logger.debug('syncBlocksFromPeer end')
          cb()
        })
      })
    })
  }

  public onPeerReady = () => {
    let nextSync = () => {
      const lastBlock = this.modules.blocks.getLastBlock()
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp)
      if (slots.getNextSlot() - lastSlot >= 3) {
        this.startSyncBlocks()
      }
      setTimeout(nextSync, constants.interval * 1000)
    }
    setImmediate(nextSync)

    setImmediate(() => {
      if (!this.isLoaded || this.isSynced) return
      this.loadUnconfirmedTransactions()
    })
  }

  onBind = (scope: any) => {
    this.modules = scope
  }

  onBlockchainReady = () => {
    debugger
    this.isLoaded = true
  }

  cleanup = () => {
    this.isLoaded = false
  }

  status = (cb) => {
    cb(null, {
      loaded: this.isLoaded
    })
  }
  
  sync() {
    return {
      syncing: this.isSynced,
      blocks: this.blocksToSync,
      height: this.modules.blocks.getLastBlock().height,
    }
  }
}
