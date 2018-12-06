import * as _ from 'lodash';
import LRU = require('lru-cache');
import Router from '../utils/router';
import slots = require('../utils/slots');

export default class Transport {
  private library: any;
  private latestBlocksCache: any = new LRU(200)
  private blockHeaderMidCache: any = new LRU(1000)
  
  private modules: any;

  private headers: any = {};
  private loaded: boolean = false;

  constructor (scope: any) {
    this.library = scope;
    this.attachApi();
  }


  private attachApi = () => {
    const router1 = new Router();
    const router = router1.router;
    console.log(router);

    router.use((req, res, next) => {
      if (this.modules.loader.syncing()) {
        return res.status(500).send({
          success: false,
          error: 'Blockchain is syncing',
        })
      }

      res.set(this.headers)

      if (req.headers.magic !== this.library.config.magic) {
        return res.status(500).send({
          success: false,
          error: 'Request is made on the wrong network',
          expected: this.library.config.magic,
          received: req.headers.magic,
        })
      }
      return next()
    })

    router.post('/newBlock', (req, res) => {
      const { body } = req
      if (!body.id) {
        return res.status(500).send({ error: 'Invalid params' })
      }
      const newBlock = this.latestBlocksCache.get(body.id)
      if (!newBlock) {
        return res.status(500).send({ error: 'New block not found' })
      }
      return res.send({ success: true, block: newBlock.block, votes: newBlock.votes })
    })

    router.post('/commonBlock', (req, res) => {
      const { body } = req
      if (!Number.isInteger(body.max)) return res.send({ error: 'Field max must be integer' })
      if (!Number.isInteger(body.min)) return res.send({ error: 'Field min must be integer' })
      const max = body.max
      const min = body.min
      const ids = body.ids
      return (async () => {
        try {
          let blocks = await app.sdb.getBlocksByHeightRange(min, max)
          // app.logger.trace('find common blocks in database', blocks)
          if (!blocks || !blocks.length) {
            return res.status(500).send({ success: false, error: 'Blocks not found' })
          }
          blocks = blocks.reverse()
          let commonBlock = null
          for (const i in ids) {
            if (blocks[i].id === ids[i]) {
              commonBlock = blocks[i]
              break
            }
          }
          if (!commonBlock) {
            return res.status(500).send({ success: false, error: 'Common block not found' })
          }
          return res.send({ success: true, common: commonBlock })
        } catch (e) {
          app.logger.error(`Failed to find common block: ${e}`)
          return res.send({ success: false, error: 'Failed to find common block' })
        }
      })()
    })

    router.post('/blocks', (req, res) => {
      const { body } = req
      let blocksLimit = 200
      if (body.limit) {
        blocksLimit = Math.min(blocksLimit, Number(body.limit))
      }
      const lastBlockId = body.lastBlockId
      if (!lastBlockId) {
        return res.status(500).send({ error: 'Invalid params' })
      }
      return (async () => {
        try {
          const lastBlock = await app.sdb.getBlockById(lastBlockId)
          if (!lastBlock) throw new Error(`Last block not found: ${lastBlockId}`)

          const minHeight = lastBlock.height + 1
          const maxHeight = (minHeight + blocksLimit) - 1
          const blocks = await this.modules.blocks.getBlocks(minHeight, maxHeight, true)
          return res.send({ blocks })
        } catch (e) {
          app.logger.error('Failed to get blocks or transactions', e)
          return res.send({ blocks: [] })
        }
      })()
    })

    router.post('/transactions', (req, res) => {
      const lastBlock = this.modules.blocks.getLastBlock()
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp)
      if (slots.getNextSlot() - lastSlot >= 12) {
        this.library.logger.error('Blockchain is not ready', {
          getNextSlot: slots.getNextSlot(),
          lastSlot,
          lastBlockHeight: lastBlock.height,
        })
        return res.status(200).json({ success: false, error: 'Blockchain is not ready' })
      }
      let transaction: any;
      try {
        transaction = this.library.base.transaction.objectNormalize(req.body.transaction)
      } catch (e) {
        this.library.logger.error('Received transaction parse error', {
          raw: req.body,
          trs: transaction,
          error: e.toString(),
        })
        return res.status(200).json({ success: false, error: 'Invalid transaction body' })
      }

      return this.library.sequence.add((cb) => {
        this.library.logger.info(`Received transaction ${transaction.id} from http client`)
        this.modules.transactions.processUnconfirmedTransaction(transaction, cb)
      }, (err) => {
        if (err) {
          this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err)
          const errMsg = err.message ? err.message : err.toString()
          res.status(200).json({ success: false, error: errMsg })
        } else {
          this.library.bus.message('unconfirmedTransaction', transaction)
          res.status(200).json({ success: true, transactionId: transaction.id })
        }
      })
    })

    router.post('/votes', (req, res) => {
      this.library.bus.message('receiveVotes', req.body.votes)
      res.send({})
    })

    router.post('/getUnconfirmedTransactions', (req, res) => {
      res.send({ transactions: this.modules.transactions.getUnconfirmedTransactionList() })
    })

    router.post('/getHeight', (req, res) => {
      res.send({
        height: this.modules.blocks.getLastBlock().height,
      })
    })

    router.post('/chainRequest', (req, res) => {
      const params = req.body
      const body = req.body.body
      try {
        if (!params.chain) {
          return res.send({ success: false, error: 'missed chain' })
        }
      } catch (e) {
        this.library.logger.error('receive invalid chain request', { error: e.toString(), params })
        return res.send({ success: false, error: e.toString() })
      }

      return this.modules.chains.request(
        params.chain,
        body.method,
        body.path,
        { query: body.query },
        (err, ret) => {
          if (!err && ret.error) {
            err = ret.error
          }

          if (err) {
            this.library.logger.error('failed to process chain request', err)
            return res.send({ success: false, error: err })
          }
          return res.send(_.assign({ success: true }, ret))
        },
      )
    })

    router.use((req, res) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' })
    })

    this.library.network.app.use('/peer', router)
  }

  public broadcast = (topic: any, message: any, recursive?: any) => {
    this.modules.peer.publish(topic, message, recursive)
  }

  // Events
  public onBind = (scope: any) => {
    this.modules = scope
    this.headers = {
      os: this.modules.system.getOS(),
      version: this.modules.system.getVersion(),
      port: this.modules.system.getPort(),
      magic: this.modules.system.getMagic(),
    }
  }

  public onBlockchainReady = () => {
    this.loaded = true
  }

  public onPeerReady = () => {
    this.modules.peer.subscribe('newBlockHeader', (message, peer) => {
      if (this.modules.loader.syncing()) {
        return
      }
      const lastBlock = this.modules.blocks.getLastBlock()
      if (!lastBlock) {
        this.library.logger.error('Last block not exists')
        return
      }

      const body = message.body
      if (!body || !body.id || !body.height || !body.prevBlockId) {
        this.library.logger.error('Invalid message body')
        return
      }
      const height = body.height
      const id = body.id.toString('hex')
      const prevBlockId = body.prevBlockId.toString('hex')
      if (height !== lastBlock.height + 1 || prevBlockId !== lastBlock.id) {
        this.library.logger.warn('New block donnot match with last block', message)
        if (height > lastBlock.height + 5) {
          this.library.logger.warn('Receive new block header from long fork')
        } else {
          this.modules.loader.syncBlocksFromPeer(peer)
        }
        return
      }
      this.library.logger.info('Receive new block header', { height, id })
      this.modules.peer.request('newBlock', { id }, peer, (err, result) => {
        if (err) {
          this.library.logger.error('Failed to get latest block data', err)
          return
        }
        if (!result || !result.block || !result.votes) {
          this.library.logger.error('Invalid block data', result)
          return
        }
        try {
          let block = result.block
          let votes = this.library.protobuf.decodeBlockVotes(Buffer.from(result.votes, 'base64'))
          block = this.library.base.block.objectNormalize(block)
          votes = this.library.base.consensus.normalizeVotes(votes)
          this.latestBlocksCache.set(block.id, result)
          this.blockHeaderMidCache.set(block.id, message)
          this.library.bus.message('receiveBlock', block, votes)
        } catch (e) {
          this.library.logger.error(`normalize block or votes object error: ${e.toString()}`, result)
        }
      })
    })

    this.modules.peer.subscribe('propose', (message) => {
      try {
        const propose = this.library.protobuf.decodeBlockPropose(message.body.propose)
        this.library.bus.message('receivePropose', propose)
      } catch (e) {
        this.library.logger.error('Receive invalid propose', e)
      }
    })

    this.modules.peer.subscribe('transaction', (message) => {
      if (this.modules.loader.syncing()) {
        return
      }
      const lastBlock = this.modules.blocks.getLastBlock()
      const lastSlot = slots.getSlotNumber(lastBlock.timestamp)
      if (slots.getNextSlot() - lastSlot >= 12) {
        this.library.logger.error('Blockchain is not ready', { getNextSlot: slots.getNextSlot(), lastSlot, lastBlockHeight: lastBlock.height })
        return
      }
      let transaction: any
      try {
        transaction = message.body.transaction
        if (Buffer.isBuffer(transaction)) transaction = transaction.toString()
        transaction = JSON.parse(transaction)
        transaction = this.library.base.transaction.objectNormalize(transaction)
      } catch (e) {
        this.library.logger.error('Received transaction parse error', {
          message,
          error: e.toString(),
        })
        return
      }

      this.library.sequence.add((cb) => {
        this.library.logger.info(`Received transaction ${transaction.id} from remote peer`)
        this.modules.transactions.processUnconfirmedTransaction(transaction, cb)
      }, (err) => {
        if (err) {
          this.library.logger.warn(`Receive invalid transaction ${transaction.id}`, err)
        } else {
          // library.bus.message('unconfirmedTransaction', transaction, true)
        }
      })
    })
  }

  public onUnconfirmedTransaction = (transaction: any) => {
    const message = {
      body: {
        transaction: JSON.stringify(transaction),
      },
    }
    this.broadcast('transaction', message)
  }

  public onNewBlock = (block, votes) => {
    this.latestBlocksCache.set(block.id,
      {
        block,
        votes: this.library.protobuf.encodeBlockVotes(votes).toString('base64'),
      }
    )
    const message = this.blockHeaderMidCache.get(block.id) || {
      body: {
        id: Buffer.from(block.id, 'hex'),
        height: block.height,
        prevBlockId: Buffer.from(block.prevBlockId, 'hex'),
      },
    }
    this.broadcast('newBlockHeader', message, 0)
  }

  public onNewPropose = (propose) => {
    const message = {
      body: {
        propose: this.library.protobuf.encodeBlockPropose(propose),
      },
    }
    this.broadcast('propose', message)
  }

  public sendVotes = (votes, address) => {
    const parts = address.split(':')
    const contact = {
      host: parts[0],
      port: parts[1],
    }
    this.modules.peer.request('votes', { votes }, contact, (err) => {
      if (err) {
        this.library.logger.error('send votes error', err)
      }
    })
  }

  public cleanup = (cb: any) => {
    this.loaded = false
    cb()
  }

  public message = (msg, cb) => {
    msg.timestamp = (new Date()).getTime()

    // self.broadcast('chainMessage', msg)

    cb(null, {})
  }

  public request = (req, cb) => {
    if (req.body.peer) {
      this.modules.peer.request('chainRequest', req, req.body.peer, (err, res) => {
        if (res) {
          res.peer = req.body.peer
        }
        cb(err, res)
      })
    } else {
      this.modules.peer.randomRequest('chainRequest', req, cb)
    }
  }

}
