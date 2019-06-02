import * as _ from 'lodash';
import BlockReward from '../../../src/utils/block-reward';
import { Modules, IScope, Next } from '../../../src/interfaces';
import { Request, Response, Router } from 'express';
import { BlockBase } from '../../../src/base/block';
import { BlocksCorrect } from '../../../src/core/blocks-correct';
import { getBlocks as getBlocksFromApi } from '../util';

export default class BlocksApi {
  private modules: Modules;
  private library: IScope;
  private loaded = false;
  private blockReward = new BlockReward();

  constructor(modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  // Events
  public onBlockchainReady = () => {
    this.loaded = true;
  };

  private attachApi() {
    const router = Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules && this.loaded === true) return next();
      return res
        .status(500)
        .send({ success: false, error: 'Blockchain is loading' });
    });

    // Mapping
    router.get('/getBlock', this.getBlock);
    router.get('/', this.getBlocks);
    router.get('/getHeight', this.getHeight);
    router.get('/getMilestone', this.getMilestone);
    router.get('/getReward', this.getReward);
    router.get('/getSupply', this.getSupply);
    router.get('/getStatus', this.getStatus);

    // Configuration
    router.use((req: Request, res: Response) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/blocks', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        this.library.logger.error(req.url, err.toString());
        return res.status(500).send({
          success: false,
          error: err.toString(),
        });
      }
    );
  }

  private getBlock = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const idOrHeight = this.library.joi
      .object()
      .keys({
        id: this.library.joi.string().min(1),
        height: this.library.joi.number().min(0),
      })
      .xor('id', 'height');
    const report = this.library.joi.validate(query, idOrHeight);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      let block;
      if (query.id) {
        block = await global.app.sdb.getBlockById(query.id);
      } else if (query.height !== undefined) {
        block = await global.app.sdb.getBlockByHeight(query.height);
      }

      if (!block) {
        return next('Block not found');
      }
      return res.json({ block: block });
    } catch (e) {
      this.library.logger.error(e);
      return next('Server error');
    }
  };

  private getBlocks = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const offset: number = query.offset ? Number(query.offset) : 0;
    const limit: number = query.limit ? Number(query.limit) : 20;
    let minHeight: number;
    let maxHeight: number;
    let needReverse = false;
    if (query.orderBy === 'height:desc') {
      needReverse = true;
      maxHeight = BlocksCorrect.getState().lastBlock.height - offset;
      minHeight = maxHeight - limit + 1;
      minHeight = minHeight > 0 ? minHeight : 0;
    } else {
      minHeight = offset;
      maxHeight = offset + limit - 1;
    }
    const withTransactions = !!query.transactions;

    try {
      // global.app.sdb.getBlocksByHeightRange(minHeight, maxHeight, true); // better?
      let blocks = await getBlocksFromApi(
        minHeight,
        maxHeight,
        withTransactions
      );
      if (needReverse) {
        blocks = _.reverse(blocks);
      }
      const count = global.app.sdb.blocksCount;
      return res.json({ count, blocks });
    } catch (err) {
      return next(err.message);
    }
  };

  private getHeight = (req: Request, res: Response, next: Next) => {
    const height = BlocksCorrect.getState().lastBlock.height;
    return res.json({ height });
  };

  private getMilestone = (req: Request, res: Response, next: Next) => {
    const height = BlocksCorrect.getState().lastBlock.height;
    const milestone = this.blockReward.calculateMilestone(height);
    return res.json({ milestone });
  };

  private getReward = (req: Request, res: Response, next: Next) => {
    const height = BlocksCorrect.getState().lastBlock.height;
    const reward = this.blockReward.calculateReward(height);
    return res.json({ reward });
  };

  private getSupply = (req: Request, res: Response, next: Next) => {
    const height = BlocksCorrect.getState().lastBlock.height;
    const supply = this.blockReward.calculateSupply(height);
    return res.json({ supply });
  };

  private getStatus = (req: Request, res: Response, next: Next) => {
    const height = BlocksCorrect.getState().lastBlock.height;
    const fee = BlockBase.calculateFee();
    const milestone = this.blockReward.calculateMilestone(height);
    const reward = this.blockReward.calculateReward(height);
    const supply = this.blockReward.calculateSupply(height);
    return res.json({
      height,
      fee,
      milestone,
      reward,
      supply,
    });
  };
}
