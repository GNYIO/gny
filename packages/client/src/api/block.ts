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
import { Connection } from '../connection';

export class Block {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getBlockById(
    id: string
  ): Promise<
    ApiResult<BlockWrapper, ServerError | BlockError | ValidationError>
  > {
    const params = {
      id: id,
    };
    const res = await this.base.get('/api/blocks/getBlock', params);
    const result: ApiResult<
      BlockWrapper,
      ServerError | BlockError | ValidationError
    > = res.data;
    return result;
  }

  public async getBlockByHeight(
    height: string
  ): Promise<
    ApiResult<BlockWrapper, ServerError | BlockError | ValidationError>
  > {
    const params = {
      height: height,
    };
    const res = await this.base.get('/api/blocks/getBlock', params);
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
  ): Promise<ApiResult<BlocksWrapper>> {
    const params = {
      offset: offset,
      limit: limit,
      orderBy: orderBy,
      transactions: transactions,
    };
    const res = await this.base.get('/api/blocks', params);
    // TODO: add error type
    const result: ApiResult<BlocksWrapper> = res.data;
    return result;
  }

  public async getHeight(): Promise<ApiResult<HeightWrapper>> {
    const res = await this.base.get('/api/blocks/getHeight');
    const result: ApiResult<HeightWrapper> = res.data;
    return result;
  }

  public async getMilestone(): Promise<ApiResult<MilestoneWrapper>> {
    const res = await this.base.get('/api/blocks/getMilestone');
    const result: ApiResult<MilestoneWrapper> = res.data;
    return result;
  }

  public async getReward(): Promise<ApiResult<RewardWrappper>> {
    const res = await this.base.get('/api/blocks/getReward');
    const result: ApiResult<RewardWrappper> = res.data;
    return result;
  }

  public async getSupply(): Promise<ApiResult<SupplyWrapper>> {
    const res = await this.base.get('/api/blocks/getSupply');
    const result: ApiResult<SupplyWrapper> = res.data;
    return result;
  }

  public async getStatus(): Promise<ApiResult<Status>> {
    const res = await this.base.get('/api/blocks/getStatus');
    const result: ApiResult<Status> = res.data;
    return result;
  }
}
