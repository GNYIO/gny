import { Basic } from './basic';

export class Transaction extends Basic {
  public async getTransactions(
    limit?: number,
    offset?: number,
    id?: string,
    senderId?: string,
    senderPublicKey?: string,
    blockId?: string,
    type?: number,
    height?: number | string,
    message?: string
  ) {
    const params = {
      limit: limit,
      offset: offset,
      id: id,
      senderId: senderId,
      senderPublicKey: senderPublicKey,
      blockId: blockId,
      type: type,
      height: height,
      message: message,
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

  public async addTransactions(transactions) {
    const params = {
      transactions: transactions,
    };
    return await this.put('/api/transactions/batch', params);
  }
}
