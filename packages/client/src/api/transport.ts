import { Base } from './base';
import { ITransaction } from '@gny/interfaces';

interface Keypair {
  publicKey: string;
  signature: string;
}
interface Votes {
  height: string;
  id: string;
  signatures: Keypair[];
}

export class Transport extends Base {
  public async sendTransaction(transaction: ITransaction) {
    const params = {
      transaction: transaction,
    };
    return await this.post('/peer/transactions', params);
  }

  public async getNewBlock(id: string) {
    const params = {
      id: id,
    };
    return await this.post('/peer/newBlock', params);
  }

  public async getBlocksByIds(max: string, min: string, ids: string[]) {
    const params = {
      max,
      min,
      ids,
    };
    return await this.post('/peer/commonBlock', params);
  }

  public async getBlocksByLimit(limit: number, lastBlockId: string) {
    const params = {
      limit,
      lastBlockId,
    };
    return await this.post('/peer/blocks', params);
  }

  public async validateVote(votes: Votes) {
    const params = {
      votes: votes,
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
