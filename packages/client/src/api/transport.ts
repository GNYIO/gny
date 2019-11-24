import { Base } from './base';
import {
  UnconfirmedTransaction,
  ApiResult,
  NewBlockWrapper,
  NewBlockError,
  CommonBlockResult,
  BlocksWrapper,
  CommonBlockError,
  ParamsError,
  TransactionIdWrapper,
  UnconfirmedTransactionsWrapper,
  HeightWrapper,
} from '@gny/interfaces';

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
  public async sendTransaction(transaction: UnconfirmedTransaction) {
    const params = {
      transaction: transaction,
    };
    const res = await this.post('/peer/transactions', params);
    const result: ApiResult<TransactionIdWrapper> = res.data;
    return result;
  }

  public async getNewBlock(id: string) {
    const params = {
      id: id,
    };
    const res = await this.post('/peer/newBlock', params);
    const result: ApiResult<NewBlockWrapper, NewBlockError> = res.data;
    return result;
  }

  public async getBlocksByIds(max: string, min: string, ids: string[]) {
    const params = {
      max,
      min,
      ids,
    };
    const res = await this.post('/peer/commonBlock', params);
    const result: ApiResult<CommonBlockResult, CommonBlockError> = res.data;
    return result;
  }

  public async getBlocksByLimit(limit: number, lastBlockId: string) {
    const params = {
      limit,
      lastBlockId,
    };
    const res = await this.post('/peer/blocks', params);
    // An error left to deal with
    const result: ApiResult<BlocksWrapper, ParamsError> = res.data;
    return result;
  }

  public async validateVote(votes: Votes) {
    const params = {
      votes: votes,
    };

    const res = await this.post('/peer/votes', params);
    const result: ApiResult<undefined> = res.data;
    return result;
  }

  public async getUnconfirmedTransactions() {
    const res = await this.post('/peer/getUnconfirmedTransactions');
    const result: ApiResult<UnconfirmedTransactionsWrapper> = res.data;
    return result;
  }

  public async getHeight() {
    const res = await this.post('/peer/getHeight');
    const result: ApiResult<HeightWrapper> = res.data;
    return result;
  }
}
