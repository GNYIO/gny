import * as _ from 'lodash';
import * as express from 'express';
import Blockreward from '../../src/utils/block-reward';
import { Modules, IScope } from '../../src/interfaces';
import { Request, Response } from 'express';
import { runInNewContext } from 'vm';
import { resolve } from 'path';

export default class BlocksApi  {
  private modules: Modules;
  private library: IScope;
  private loaded = false;
  private blockreward = new Blockreward();

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
    router.get('/', this.getBlocks);
    router.get('/getHeight', this.getHeight);
    router.get('/getMilestone', this.getMilestone);
    router.get('/getReward', this.getReward);
    router.get('/getSupply', this.getSupply);
    router.get('/getStatus', this.getStatus);

    // v2
    router.get('/:heightOrId', this.getBlockByHeightOrId);

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

  private getBlock = async (req: Request, res: Response, next) => {
    // if (!this.loaded) {
    //   return 'Blockchain is loading'
    // }
    const query = req.query;

    const report = this.library.scheme.validate(query, {
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
    });
    if (!report) {
      return next(this.library.scheme.getLastError())
    }

    try {
      let block
      if (query.id) {
        block = await global.app.sdb.getBlockById(query.id)
      } else if (query.height !== undefined) {
        block = await global.app.sdb.getBlockByHeight(query.height)
      } else {
        return next('you need to provide either id or height')
      }

      if (!block) {
        return next('Block not found')
      }
      return res.json({ block: block });
    } catch (e) {
      this.library.logger.error(e)
      return next('Server error')
    }
  }


  private getBlocks = (req, cb) => async (req) => {
    const query = req.query
    const offset = query.offset ? Number(query.offset) : 0
    const limit = query.limit ? Number(query.limit) : 20
    let minHeight
    let maxHeight
    let needReverse = false
    if (query.orderBy === 'height:desc') {
      needReverse = true
      maxHeight = this.modules.blocks.getLastBlock().height - offset
      minHeight = (maxHeight - limit) + 1
      minHeight = minHeight > 0 ? minHeight : 0
    } else {
      minHeight = offset
      maxHeight = (offset + limit) - 1
    }
    const withTransactions = !!query.transactions
    let blocks = await this.modules.blocks.getBlocks(minHeight, maxHeight, withTransactions)
    if (needReverse) {
      blocks = _.reverse(blocks)
    }
    const count = global.app.sdb.blocksCount
    return { count, blocks }
  }

  private getHeight = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    return cb(null, { height: this.modules.blocks.getLastBlock().height })
  }

  private getMilestone = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.modules.blocks.getLastBlock().height
    return cb(null, { milestone: this.blockreward.calculateMilestone(height) })
  }

  private getReward = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.modules.blocks.getLastBlock().height
    return cb(null, { reward: this.blockreward.calculateReward(height) })
  }

  private getSupply = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.modules.blocks.getLastBlock().height
    return cb(null, {
      supply: this.blockreward.calculateSupply(height)
    })
  }

  private getStatus = (req, cb) => {
    if (!this.loaded) {
      return cb('Blockchain is loading')
    }
    const height = this.modules.blocks.getLastBlock().height
    return cb(null, {
      height,
      fee: this.library.base.block.calculateFee(),
      milestone: this.blockreward.calculateMilestone(height),
      reward: this.blockreward.calculateReward(height),
      supply: this.blockreward.calculateSupply(height),
    })
  }

  private getBlockByHeightOrId = async (req) => {
    const idOrHeight = req.params.idOrHeight
    let block
    if (idOrHeight.length === 64) {
      let id = idOrHeight
      block = await global.app.sdb.getBlockById(id)
    } else {
      let height = Number(idOrHeight)
      if (Number.isInteger(height) && height >= 0) {
        block = await global.app.sdb.getBlockByHeight(height)
      }
    }
    if (!block) throw new Error('Block not found')
    if (!!req.query.transactions) {
      const transactions = await global.app.sdb.findAll('Transaction', {
        condition: {
          height: block.height,
        },
      })
      block.transactions = transactions
    }
    return { block }
  }
}