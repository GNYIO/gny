import { Base } from './base';
import {
  ApiResult,
  ValidationError,
  NftMakerWrapper,
  SingleNftMakerWrapper,
  NftWrapper,
  SingleNftWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

interface OnlyHash {
  hash: string;
}

interface OnlyName {
  name: string;
}

export class Nft {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getNftMakers(
    offset?: number,
    limit?: number
  ): Promise<ApiResult<NftMakerWrapper>> {
    const params = {
      offset: offset,
      limit: limit,
    };
    const res = await this.base.get('/api/nft/makers', params);
    const result: ApiResult<NftMakerWrapper, ValidationError> = res.data;
    return result;
  }

  public async getSingleNftMaker(name: string) {
    const res = await this.base.get(`/api/nft/makers/${name}`);
    const result: ApiResult<SingleNftMakerWrapper, ValidationError> = res.data;
    return result;
  }

  public async getNfts(
    offset?: number,
    limit?: number,
    maker?: string
  ): Promise<ApiResult<NftWrapper>> {
    const params = {
      offset,
      limit,
      maker,
    };
    const res = await this.base.get('/api/nft', params);
    const result: ApiResult<NftWrapper, ValidationError> = res.data;
    return result;
  }

  public async getSingleNft(
    query: OnlyHash | OnlyName
  ): Promise<ApiResult<SingleNftWrapper>> {
    const res = await this.base.get(`/api/nft/getNft`, query);
    const result: ApiResult<SingleNftWrapper, ValidationError> = res.data;
    return result;
  }
}
