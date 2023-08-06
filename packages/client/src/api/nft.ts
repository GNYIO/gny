import { Base } from './base';
import { ApiResult, ValidationError, NftMakerWrapper } from '@gny/interfaces';
import { Connection } from '../connection';

export class Nft {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getNftMakers(
    offset?: string,
    limit?: string
  ): Promise<ApiResult<NftMakerWrapper>> {
    const params = {
      offset: offset,
      limit: limit,
    };
    const res = await this.base.get('/api/nft/makers', params);
    const result: ApiResult<NftMakerWrapper, ValidationError> = res.data;
    return result;
  }
}
