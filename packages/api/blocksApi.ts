import * as express from 'express';
import { Modules, IScope } from '../../src/interfaces'


export default class BlocksApi  {
  private modules: Modules;
  private library: IScope;
  private loaded = false;

  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  // Events
  public onBlockchainReady = () => {
    this.loaded = true;
  }

  private attachApi() {
    const router = express.Router();

    router.use((req, res, next) => {
      if (this.modules) return next()
      return res.status(500).send({ success: false, error: 'Blockchain is loading' });
    })

    // Mapping
    router.get('/get', this.getBlock);
    router.get('/full', this.getFullBlock);
    router.get('/', this.getBlocks);
    router.get('/getHeight', this.getHeight);
    router.get('/getMilestone', this.getMilestone);
    router.get('/getReward', this.getReward);
    router.get('/getSupply', this.getSupply);
    router.get('/getStatus', this.getStatus);

    // Configuration
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

  private getBlock = (req, cb) => {
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

          if (!block) {
            return cb('Block not found')
          }
          return cb(null, { block: block })
        } catch (e) {
          this.library.logger.error(e)
          return cb('Server error')
        }
      })()
    })
  }

  private getFullBlock = (req, cb) => {
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
            v1Block.numberOfTransactions = Array.isArray(transactions) ? transactions.length : 0
            return cb(null, { block: v1Block })
          })
        } catch (e) {
          this.library.logger.error('Failed to find block', e)
          return cb(`Server error : ${e.message}`)
        }
      })()
    })
  }

  private getBlocks = (req, cb) => {
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
  }

  private getHeight = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    return cb(null, { height: this.lastBlock.height })
  }

  private getMilestone = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.lastBlock.height
    return cb(null, { milestone: this.blockStatus.calcMilestone(height) })
  }

  private getReward = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.lastBlock.height
    return cb(null, { reward: this.blockStatus.calcReward(height) })
  }

  private getSupply = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.lastBlock.height
    return cb(null, { supply: this.blockStatus.calcSupply(height) })
  }

  private getStatus = (req, cb) => {
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