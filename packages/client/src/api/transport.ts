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
  P2PApiResult,
  ApiSuccess,
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
    const result: P2PApiResult<TransactionIdWrapper> = res.data;
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
    const result: P2PApiResult<BlocksWrapper> = res.data;
    return result;
  }

  public async validateVote(votes: Votes) {
    const params = {
      votes: votes,
    };

    const res = await this.post('/peer/votes', params);
    const result: P2PApiResult<ApiSuccess> = res.data;
    return result;
  }

  public async getUnconfirmedTransactions() {
    const res = await this.post('/peer/getUnconfirmedTransactions');
    const result: P2PApiResult<undefined> = res.data;
    return result;
  }

  public async getHeight() {
    const res = await this.post('/peer/getHeight');
    const result: P2PApiResult<HeightWrapper> = res.data;
    return result;
  }
}
