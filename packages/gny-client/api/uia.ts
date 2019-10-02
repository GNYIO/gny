import { Base } from './base';
import { uia } from '../';
export class Uia extends Base {
  public async getIssuers(limit?: number, offset?: number) {
    const params = {
      limit: limit,
      offset: offset,
    };
    return await this.get('/api/uia/issuers', params);
  }

  public async isIssuer(address: string) {
    return await this.get(`/api/uia/isIssuer/${address}`);
  }

  public async getIssuer(name: string) {
    return await this.get(`/api/uia/issuers/${name}`);
  }

  public async getIssuerAssets(name: string, limit?: number, offset?: number) {
    const params = {
      limit: limit,
      offset: offset,
    };
    return await this.get(`/api/uia/issuers/${name}/assets`, params);
  }

  public async getAssets(limit?: number, offset?: number) {
    const params = {
      limit: limit,
      offset: offset,
    };
    return await this.get('/api/uia/assets', params);
  }

  public async getAsset(name: string) {
    return await this.get(`/api/uia/assets/${name}`);
  }

  public async getBalances(address: string, limit?: number, offset?: number) {
    const params = {
      limit: limit,
      offset: offset,
    };
    return await this.get(`/api/uia/balances/${address}`, params);
  }

  public async getBalance(address: string, currency: string) {
    return await this.get(`/api/uia/balances/${address}/${currency}`);
  }

  public async registerAsset(
    name: string,
    desc: string,
    maximum: string,
    precision: number,
    secret: string,
    secondSecret?: string
  ) {
    const trs = uia.registerAsset(
      name,
      desc,
      maximum,
      precision,
      secret,
      secondSecret
    );
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }

  public async registerIssuer(
    name: string,
    desc: string,
    secret: string,
    secondSecret?: string
  ) {
    const trs = uia.registerIssuer(name, desc, secret, secondSecret);
    const params = {
      transaction: trs,
    };
    return await this.post('/peer/transactions', params);
  }
}
