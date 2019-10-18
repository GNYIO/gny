import { Base } from './base';
import { ITransaction } from '@gny/interfaces';

export class Transport extends Base {
  public async sendTransaction(transaction: ITransaction) {
    const params = {
      transaction: transaction,
    };
    return await this.post('/peer/transactions', params);
  }
}
