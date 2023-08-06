import { Base } from './base';
import {
  ApiResult,
  INftsMaker,
  ValidationError,
  NftsMakerWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

export class Nft {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getNftMakers(
    offset?: string,
    limit?: string
  ): Promise<ApiResult<NftsMakerWrapper>> {
    const params = {
      offset: offset,
      limit: limit,
    };
    const res = await this.base.get('/api/nfts/makers', params);
    const result: ApiResult<NftsMakerWrapper, ValidationError> = res.data;
    return result;
  }
}
