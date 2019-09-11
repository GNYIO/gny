import { Basic } from './basic';

export class Uia extends Basic {
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
}
