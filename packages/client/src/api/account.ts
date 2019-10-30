import { Base } from './base';

interface OnlyAddress {
  address: string;
}

interface OnlyUserName {
  username: string;
}

export class Account extends Base {
  public async generateAccount() {
    return await this.get('/api/accounts/generateAccount');
  }

  public async openAccount(secret: string) {
    return await this.post('/api/accounts/open', { secret: secret });
  }

  public async getBalance(address: string) {
    const params = { address: address };
    return await this.get('/api/accounts/getBalance', params);
  }

  public async getAddressCurrencyBalance(address: string, currency: string) {
    return await this.get(`/api/accounts/${address}/${currency}`);
  }

  public async getAccountByAddress(address: string) {
    const params = { address: address };
    return await this.get('/api/accounts/', params);
  }

  public async getAccountByUsername(username: string) {
    const params = { username: username };
    return await this.get('/api/accounts/', params);
  }

  public async getVotedDelegates(query: OnlyAddress | OnlyUserName) {
    return await this.get('/api/accounts/getVotes', query);
  }

  public async countAccounts() {
    return await this.get('/api/accounts/count');
  }

  public async getPublicKey(address: string) {
    const params = {
      address: address,
    };
    return await this.get('/api/accounts/getPublicKey', params);
  }

  public async generatePublicKey(secret: string) {
    const params = {
      secret: secret,
    };
    return await this.post('/api/accounts/generatePublicKey', params);
  }
}
