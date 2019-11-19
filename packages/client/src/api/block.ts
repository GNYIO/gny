import { Base } from './base';
import {
  ApiResult,
  BlockWrapper,
  ServerError,
  BlockError,
  ValidationError,
  BlocksWrapper,
  HeightWrapper,
  MilestoneWrapper,
  RewardWrappper,
  SupplyWrapper,
  Status,
} from '@gny/interfaces';

export class Block extends Base {
  public async getBlockById(id: string) {
    const params = {
      id: id,
    };
    const res = await this.get('/api/blocks/getBlock', params);
    const result: ApiResult<
      BlockWrapper,
      ServerError | BlockError | ValidationError
    > = res.data;
    return result;
  }

  public async getBlockByHeight(height: string) {
    const params = {
      height: height,
    };
    const res = await this.get('/api/blocks/getBlock', params);
    const result: ApiResult<
      BlockWrapper,
      ServerError | BlockError | ValidationError
    > = res.data;
    return result;
  }

  public async getBlocks(
    offset?: string,
    limit?: string,
    orderBy?: string,
    transactions?: boolean
  ) {
    const params = {
      offset: offset,
      limit: limit,
      orderBy: orderBy,
      transactions: transactions,
    };
    const res = await this.get('/api/blocks', params);
    // TODO: add error type
    const result: ApiResult<BlocksWrapper> = res.data;
    return result;
  }

  public async getHeight() {
    const res = await this.get('/api/blocks/getHeight');
    const result: ApiResult<HeightWrapper> = res.data;
    return result;
  }

  public async getMilestone() {
    const res = await this.get('/api/blocks/getMilestone');
    const result: ApiResult<MilestoneWrapper> = res.data;
    return result;
  }

  public async getReward() {
    const res = await this.get('/api/blocks/getReward');
    const result: ApiResult<RewardWrappper> = res.data;
    return result;
  }

  public async getSupply() {
    const res = await this.get('/api/blocks/getSupply');
    const result: ApiResult<SupplyWrapper> = res.data;
    return result;
  }

  public async getStatus() {
    const res = await this.get('/api/blocks/getStatus');
    const result: ApiResult<Status> = res.data;
    return result;
  }
}
