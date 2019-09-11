import { Basic } from './basic';

export class Transport extends Basic {
  public async getNewBlock(id: string) {
    const params = {
      id: id,
    };
    return await this.post('/peer/newBlock', params);
  }

  public async getCommonBlock(max: string, min: string, ids: string[]) {
    const params = {
      max,
      min,
      ids,
    };
    return await this.post('/peer/transfers', params);
  }

  public async getBlocks(lastBlockId: string, limit?: number) {
    const params = {
      lastBlockId,
      limit,
    };
    return await this.post('/peer/blocks', params);
  }

  public async getTransactions(transaction: any) {
    const params = {
      transaction: transaction,
    };
    return await this.post('/peer/transactions', params);
  }

  public async getVotes(height: string, id: string, signatures: any) {
    const params = {
      votes: {
        height: height,
        id: id,
        signatures: signatures,
      },
    };
    return await this.post('/peer/votes', params);
  }

  public async getUnconfirmedTransactions() {
    return await this.post('/peer/getUnconfirmedTransactions');
  }

  public async getHeight() {
    return await this.post('/peer/getHeight');
  }
}
