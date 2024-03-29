import lodash from 'lodash';
import { BlockReward } from '@gny/utils';
import {
  IScope,
  Next,
  IBlock,
  IHttpApi,
  ApiResult,
  BlockWrapper,
  BlocksWrapper,
  HeightWrapper,
  MilestoneWrapper,
  RewardWrappper,
  SupplyWrapper,
  Status,
  IBurn,
} from '@gny/interfaces';
import { Request, Response, Router } from 'express';
import { BlockBase } from '@gny/base';
import { getBlocks as getBlocksFromApi } from '../util.js';
import { StateHelper } from '../../core/StateHelper.js';
import BigNumber from 'bignumber.js';
import { joi } from '@gny/extended-joi';
import { Burn } from '@gny/database-postgres';

export default class BlocksApi implements IHttpApi {
  private library: IScope;
  private blockReward = new BlockReward();

  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }

  public attachApi() {
    const router = Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
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
    router.get('/cached', this.cached);

    // Configuration
    router.use((req: Request, res: Response) => {
      res.status(500).send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/blocks', router);
    this.library.network.app.use(
      (err: string, req: Request, res: Response, next: Next) => {
        if (!err) return next();
        const span = global.library.tracer.startSpan('BlocksApi');
        span.setTag('error', true);
        span.log({
          value: `req.url ${err}`,
        });
        span.finish();

        this.library.logger.error(req.url);
        this.library.logger.error(err);

        return res.status(500).send({
          success: false,
          error: err.toString(),
        });
      }
    );
  }

  private getBlock = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    const idOrHeight = joi
      .object()
      .keys({
        id: joi.string().min(1),
        height: [
          joi
            .number()
            .integer()
            .min(0),
          joi.string().positiveOrZeroBigInt(),
        ],
      })
      .xor('id', 'height');
    const report = joi.validate(query, idOrHeight);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks/getBlock',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      let block: IBlock;
      if (query.id) {
        block = await global.app.sdb.getBlockById(query.id);
      } else if (query.height !== undefined) {
        block = await global.app.sdb.getBlockByHeight(query.height);
      }

      if (!block) {
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/blocks/getBlock',
          statusCode: '500',
        });

        return next('Block not found');
      }

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks/getBlock',
        statusCode: '200',
      });
      const result: ApiResult<BlockWrapper> = {
        success: true,
        block,
      };
      return res.json(result);
    } catch (e) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks/getBlock',
        statusCode: '500',
      });

      const span = this.library.tracer.startSpan('BlocksApi.getBlock');
      span.setTag('error', true);
      span.log({
        value: e.message,
      });
      span.finish();

      this.library.logger.error(e);
      return next('Server error');
    }
  };

  private getBlocks = async (req: Request, res: Response, next: Next) => {
    const { query } = req;

    query.offset = query.offset ? Number(query.offset) : 0;
    query.limit = query.limit ? Number(query.limit) : 20;

    // limit and offset required because already set above
    const schema = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(100)
        .required(),
      offset: joi
        .number()
        .integer()
        .min(0)
        .required(),
      orderBy: joi
        .string()
        .valid(['height:asc', 'height:desc'])
        .optional(),
      transactions: joi.any().optional(),
    });

    const report = joi.validate(query, schema);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const offset = query.offset;
    const limit = query.limit;

    let minHeight: string;
    let maxHeight: string;
    let needReverse = false;
    if (query.orderBy === 'height:desc') {
      needReverse = true;
      maxHeight = new BigNumber(StateHelper.getState().lastBlock.height)
        .minus(offset)
        .toFixed();
      minHeight = new BigNumber(maxHeight)
        .minus(limit)
        .plus(1)
        .toFixed();
      minHeight = new BigNumber(minHeight).isGreaterThan(0)
        ? String(minHeight)
        : String(0);
    } else {
      minHeight = String(offset);
      maxHeight = new BigNumber(offset)
        .plus(limit)
        .minus(1)
        .toFixed();
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
        blocks = lodash.reverse(blocks);
      }
      const count = global.app.sdb.blocksCount;
      const result: ApiResult<BlocksWrapper> = {
        success: true,
        count,
        blocks,
      };

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks',
        statusCode: '200',
      });

      return res.json(result);
    } catch (err) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/blocks',
        statusCode: '500',
      });

      return next(err.message);
    }
  };

  private getHeight = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/blocks/getHeight',
      statusCode: '200',
    });

    const height = StateHelper.getState().lastBlock.height;
    const result: ApiResult<HeightWrapper> = {
      success: true,
      height,
    };
    return res.json(result);
  };

  private getMilestone = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/blocks/getMilestone',
      statusCode: '200',
    });

    const height = StateHelper.getState().lastBlock.height;
    const milestone = this.blockReward.calculateMilestone(height);
    const result: ApiResult<MilestoneWrapper> = {
      success: true,
      milestone,
    };
    return res.json(result);
  };

  private getReward = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/blocks/getReward',
      statusCode: '200',
    });

    const height = StateHelper.getState().lastBlock.height;
    const reward = this.blockReward.calculateReward(height);
    const result: ApiResult<RewardWrappper> = {
      success: true,
      reward,
    };
    return res.json(result);
  };

  private getSupply = async (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/blocks/getSupply',
      statusCode: '200',
    });

    const height = StateHelper.getState().lastBlock.height;
    const supply = this.blockReward.calculateSupply(height).toFixed();

    const allBurns: IBurn[] = await global.app.sdb.findAll<Burn>(Burn, {
      condition: {},
    });

    let burnedSum = String(0);
    for (let i = 0; i < allBurns.length; ++i) {
      const one = allBurns[i];
      burnedSum = new BigNumber(burnedSum).plus(one.amount).toFixed(0);
    }

    const result: ApiResult<SupplyWrapper> = {
      success: true,
      deprecated: supply,
      burned: burnedSum,
      supply: new BigNumber(supply).minus(burnedSum).toFixed(0),
    };
    return res.json(result);
  };

  private getStatus = (req: Request, res: Response, next: Next) => {
    global.app.prom.requests.inc({
      method: 'GET',
      endpoint: '/api/blocks/getStatus',
      statusCode: '200',
    });

    const height = StateHelper.getState().lastBlock.height;
    const fee = BlockBase.calculateFee();
    const milestone = this.blockReward.calculateMilestone(height);
    const reward = this.blockReward.calculateReward(height);
    const supply = this.blockReward.calculateSupply(height).toFixed();
    const result: ApiResult<Status> = {
      success: true,
      height,
      fee,
      milestone,
      reward,
      supply,
    };
    return res.json(result);
  };

  private cached = (req: Request, res: Response, next: Next) => {
    const entries = global.latestBlocksCache.dump();
    console.log(entries);

    return res.json(entries);
  };
}
