import { Base } from './base';

export class Block extends Base {
  public async getBlockById(id: string) {
    const params = {
      id: id,
    };
    return await this.get('/api/blocks/getBlock', params);
  }

  public async getBlockByHeight(height: string) {
    const params = {
      height: height,
    };
    return await this.get('/api/blocks/getBlock', params);
  }

  public async getBlocks(
    offset?: string,
    limit?: string,
    orderBy?: string,
    transactions?: boolean
  ) {
    const params = {
      offset: offset,
      limit: limit,
      orderBy: orderBy,
      transactions: transactions,
    };
    return await this.get('/api/blocks', params);
  }

  public async getMilestone() {
    return await this.get('/api/blocks/getMilestone');
  }

  public async getReward() {
    return await this.get('/api/blocks/getReward');
  }

  public async getSupply() {
    return await this.get('/api/blocks/getSupply');
  }

  public async getStatus() {
    return await this.get('/api/blocks/getStatus');
  }
}
