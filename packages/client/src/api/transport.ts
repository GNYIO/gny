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
}
