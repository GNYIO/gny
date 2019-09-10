import { Basic } from './basic';

export class Account extends Basic {
  public async generateAccount() {
    return await this.get('/api/generateAccount');
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

  public async getVotedDelegates(address: string, username: string) {
    const params = {
      address: address,
      username: username,
    };
    return await this.get('/api/accounts/getVotes', params);
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
