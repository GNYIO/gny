import { getConnection, Repository } from 'typeorm';
import { Block } from '../entity/Block';

export class BlockRepository {

    /**
     * Get a block by id
     * @param {string} table
     * @return {Promise<any>}
     */
    public async getById(id: string): Promise<any> {
        const blockRepo = this._connectToRepo();
        const data = await blockRepo.createQueryBuilder('block')
                .where('block.id = :id', { id: id })
                .getOne();
        return data;
    }

    /**
     * Get a block by height
     * @param {number} height
     * @return {Promise<any>} data
     */
    public async getByHeight(height: number): Promise<any> {
        const blockRepo = this._connectToRepo();
        const data = await blockRepo.createQueryBuilder('block')
                .where('block.height = :height', { height: height })
                .getOne();
        return data;
    }

    /**
     * Get blocks by height range
     * @param {number} min
     * @param {number} max
     * @return {Promise<any>}
     */

    public async getByHeightRange(min: number, max: number): Promise<any> {
        const blockRepo = this._connectToRepo();
        const data = await blockRepo.createQueryBuilder('block')
                .where('block.height >= :min', { min: min })
                .andWhere('block.height < :max', { max: max })
                .getMany();
        return data;
    }

    /**
     * Get last block
     * @return {Promise<any>}
     */
    public async getLastBlock(): Promise<any> {
        const blockRepo = this._connectToRepo();
        const timestamp = await blockRepo.createQueryBuilder('block')
                .select('MAX(block.timestamp)', 'lastTimestamp')
                .getRawOne();
        if (!timestamp.lastTimestamp) {
            const block = await blockRepo.createQueryBuilder('block')
                .where('block.timestamp = :timestamp', { timestamp: timestamp.lastTimestamp })
                .getOne();
            return block;
        } else {
            return undefined;
        }
    }

    /**
     * Connect to block repo
     * @return {Repository<Block>}
     */
    private _connectToRepo(): Repository<Block> {
        const connection = getConnection();
        return  connection.getRepository(Block);
    }

}
