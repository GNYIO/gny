import { Base } from './base';

interface Query {
  limit?: number;
  offset?: number;
  id?: string;
  senderId?: string;
  senderPublicKey?: string;
  blockId?: string;
  type?: number;
  height?: number | string;
  message?: string;
}
export class Transaction extends Base {
  public async getTransactions(query: Query) {
    const params = {
      limit: query.limit,
      offset: query.offset,
      id: query.id,
      senderId: query.senderId,
      senderPublicKey: query.senderPublicKey,
      blockId: query.blockId,
      type: query.type,
      height: query.height,
      message: query.message,
    };
    return await this.get('/api/transactions/', params);
  }

  public async getUnconfirmedTransaction(id: string) {
    const params = {
      id: id,
    };
    return await this.get('/api/transactions/unconfirmed/get', params);
  }

  public async getUnconfirmedTransactions(
    senderPublicKey: string,
    address: string
  ) {
    const params = {
      senderPublicKey: senderPublicKey,
      address: address,
    };
    return await this.get('/api/transactions/unconfirmed', params);
  }

  public async addTransactionUnsigned(
    secret: string,
    fee: string,
    type: number,
    secondSecret?: string,
    args?: [],
    message?: string,
    senderId?: string
  ) {
    const params = {
      secret: secret,
      fee: fee,
      type: type,
      secondSecret: secondSecret,
      args: args,
      message: message,
      senderId: senderId,
    };
    return await this.put('/api/transactions/', params);
  }

  public async addTransactions(transactions: any) {
    const params = {
      transactions: transactions,
    };
    return await this.put('/api/transactions/batch', params);
  }
}
