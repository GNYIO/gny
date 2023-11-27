import { Base } from './base';
import {
  ApiResult,
  ValidationError,
  DatMakerWrapper,
  SingleDatMakerWrapper,
  DatWrapper,
  SingleDatWrapper,
} from '@gny/interfaces';
import { Connection } from '../connection';

interface OnlyHash {
  hash: string;
}

interface OnlyName {
  name: string;
}

interface OnlyOwnerAddress {
  ownerAddress?: string;
  limit?: number;
  offset?: number;
}

interface OnlyMaker {
  maker?: string;
  limit?: number;
  offset?: number;
}

export class Dat {
  private base: Base;

  constructor(connection: Connection) {
    this.base = new Base(connection);
  }

  public async getDatMakers(
    offset?: number,
    limit?: number,
    address?: string
  ): Promise<ApiResult<DatMakerWrapper>> {
    const params = {
      offset: offset,
      limit: limit,
      address: address,
    };
    const res = await this.base.get('/api/dat/makers', params);
    const result: ApiResult<DatMakerWrapper, ValidationError> = res.data;
    return result;
  }

  public async getSingleDatMaker(name: string) {
    const res = await this.base.get(`/api/dat/makers/${name}`);
    const result: ApiResult<SingleDatMakerWrapper, ValidationError> = res.data;
    return result;
  }

  public async getDats(
    query?: OnlyOwnerAddress | OnlyMaker
  ): Promise<ApiResult<DatWrapper>> {
    const res = await this.base.get('/api/dat', query);
    const result: ApiResult<DatWrapper, ValidationError> = res.data;
    return result;
  }

  public async getSingleDat(
    query: OnlyHash | OnlyName
  ): Promise<ApiResult<SingleDatWrapper>> {
    const res = await this.base.get(`/api/dat/getDat`, query);
    const result: ApiResult<SingleDatWrapper, ValidationError> = res.data;
    return result;
  }
}
