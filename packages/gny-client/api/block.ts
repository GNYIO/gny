import { Basic } from './basic';

export class Block extends Basic {
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

  public async getBlocks(offset: string, limit: string) {
    const params = {
      offset: offset,
      limit: limit,
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
