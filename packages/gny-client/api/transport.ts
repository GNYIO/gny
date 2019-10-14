import { Base } from './base';
import { ITransaction } from '@gny/interfaces';

export class Transport extends Base {
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
    return await this.post('/peer/commonBlock', params);
  }

  public async getBlocks(lastBlockId: string, limit?: number) {
    const params = {
      lastBlockId,
      limit,
    };
    return await this.post('/peer/blocks', params);
  }

  public async sendTransaction(transaction: ITransaction) {
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
}
