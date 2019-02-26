import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { createConnection, Connection, getConnection, MoreThan, ConnectionOptions } from 'typeorm';

import { Account } from './entity/Account';
import { Asset } from './entity/Asset';
import { Balance } from './entity/Balance';
import { Block } from './entity/Block';
import { Delegate } from './entity/Delegate';
import { Issuer } from './entity/Issuer';
import { Round } from './entity/Round';
import { Transaction } from './entity/Transaction';
import { Transfer } from './entity/Transfer';
import { Variable } from './entity/Variable';
import { Vote } from './entity/Vote';
import { ILogger } from '../../src/interfaces';

interface LimitAndOffset {
    limit: number;
    offset: number;
}

const ENTITY: any = {
    'Account': Account,
    'Asset': Asset,
    'Balance': Balance,
    'Block': Block,
    'Delegate': Delegate,
    'Issuer': Issuer,
    'Round': Round,
    'Transaction': Transaction,
    'Variable': Variable,
    'Vote': Vote,
    'Transfer': Transfer
};



export class SmartDB {
    connection: Connection;
    // lastBlock: Promise<any>;
    blockQueryRunner: any;
    private logger: ILogger;
    constructor (logger: ILogger) {
        this.logger = logger;
        this.blockQueryRunner = undefined;
    }

    /**
     * Init database with Entities
     * @return {Promise<void>}
     */
    public async init(): Promise<void> {

        const configPath = path.join(process.cwd(), 'ormconfig.json');
        const optionsRaw = fs.readFileSync(configPath, { encoding: 'utf8' });
        const options: ConnectionOptions = JSON.parse(optionsRaw);
        this.connection = await createConnection(options);

        // Default config: ormconfig.json(near package.json)
        // this.connection = await createConnection();
        this.logger.info('Initialized smartdb');
    }

    /**
     * Find one item from the given table:
     * Existed repos: Balance, Asset, Issuer, Account
     * TODO repo: GatewayCurrency, Proposal
     * @param {string} table
     * @param {any} condition
     * @return {Promise<any>} result
     */
    public async findOne(table: string, condition: any): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        const id = this.createCacheId(table, condition);
        const result = await repo.find({
            where: condition,
            take: 1,
            cache: {
                id: id,
            },
        });

        return result[0];
    }

    /**
     * Find all the items in the given table according to some constraits
     * Used by: Vote, Balance, Asset, GatewayCurrency, Account, Transaction, Transfer,
     * ProposalVote,
     * @param {string} table
     * @param {any} condition
     * @param {number} limit
     * @param {number} offset
     * @param {any} sort - TODO
     * @return {Promise<any>}
     */
    public async findAll(table: string, condition?: any, limit: number = 0, offset: number = 0, sort?: any): Promise<any> {
        // TODO sort
        if (!sort) {
            sort = undefined;
        }
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        const result = await repo.find({
            where: condition,
            take: limit,
            skip: offset,
            cache: {
                id: 'findAll' + table,
            },
        });

        return result;
    }

    /**
     * Find one item from the given table
     * @param {string} table
     * @param {any} condition
     * @param {number} limit
     * @param {number} offset
     * @return {Promise<any>}
     */
    public async find(table: string, condition: any, limitAndOffset?: LimitAndOffset): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        const result = await repo.find({
            where: condition,
            take: limitAndOffset.limit,
            offset: limitAndOffset.offset,
            cache: {
                id: 'find' + table,
            },
        });

        return result;
    }

    /**
     * Get one item from the given table
     * @param {string} table
     * @param {any} condition
     * @return {Promise<any>}
     */
    public async get(table: string, condition: any): Promise<any> {
        return await this.findOne(table, condition);
    }

    /**
     * Get all the items in the given table
     * Only used by Delegate
     * @param {string} table
     * @return {Promise<any>}
     */
    public async getAll(table: string): Promise<any> {
        return await this.findAll(table);
    }

    /**
     * Count the rows in the table
     * ONLY transaction's corresponding method was modified.
     * @param {string} table
     * @param {any} condition
     * @return {Promise<number>} num
     */
    public async count(table: string, condition: any): Promise<number> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        const num = await repo.count({
            where: condition,
            cache: {
                id: 'count' + table,
            },
        });

        return num;
    }

    /**
     * Get a block by id
     * @param {string} id
     * @return {Promise<any>}
     */
    public async getBlockById(id: string): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(Block);
        const data = await repo.find({
                where: {id: id},
                take: 1,
            });
        return data[0];
    }

    /**
     * Get a block by height
     * @param {number} height
     * @return {Promise<any>}
     */
    public async getBlockByHeight(height: number): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(Block);
        const data = await repo.find({
            take: 1,
            where: { height: height },
        });
        return data[0];
    }

    /**
     * Get blocks by height range
     * @param {number} min
     * @param {number} max
     * @return {Promise<any>}
     */
    public async getBlocksByHeightRange(min: number, max: number): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(Block);
        const data = await repo.createQueryBuilder('block')
                .where('block.height >= :min', { min: min })
                .andWhere('block.height <= :max', { max: max })
                .getMany();
        return data;
    }

    /**
     * Count the numbers of blocks
     * @return {Promise<number>}
     */
    public async blocksCount(): Promise<number> {
        const connection = getConnection();
        const repo = connection.getRepository(Block);
        const num = await repo.count({select: ['id']});
        return num;
    }

    /**
     * Get the last Block
     * @return {Promise<any>}
     */
    public async getLastBlock(): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(Block);
        const timestamp = await repo.createQueryBuilder('block')
                .select('MAX(block.timestamp)', 'lastTimestamp')
                .getRawOne();
        if (!timestamp.lastTimestamp) {
            const block = await repo.createQueryBuilder('block')
                .where('block.timestamp = :timestamp', { timestamp: timestamp.lastTimestamp })
                .getOne();
            return block;
        } else {
            return undefined;
        }
    }

    /**
     * Begin to save the block to the memory
     * @param {Block} block
     * @return {Promise<void>}
     */
    public async beginBlock(block: Block): Promise<void> {
        const connection = getConnection();
        this.blockQueryRunner = connection.createQueryRunner();
        await this.blockQueryRunner.connect();
        await this.blockQueryRunner.startTransaction();
        await this.blockQueryRunner.manager.save(Block, block);
        this.logger.info('Began a block height: ' + block.height);
    }

    /**
     * Commit the Block from the memory
     * @return {Promise<void>}
     */
    public async commitBlock(height): Promise<void> {
        try {
            await this.blockQueryRunner.commitTransaction();
            this.logger.info('Commited the block height: ' + height);
        } finally {
            await this.blockQueryRunner.release();
        }
    }

    /**
     * Rollback the block when error is encountered
     * @param {number?} height
     * @return {Promise<void>}
     */
    public async rollbackBlock(height?: number): Promise<void> {
        if (height >= 0) {
            await this.del('Block', { height: MoreThan(height)});
            this.logger.info('Rollback to height:' + height);
        } else {
            await this.blockQueryRunner.rollbackTransaction();
            await this.blockQueryRunner.release();
            this.logger.info('Rollback the block');
        }
    }

    /**
     * Check if the data exists
     * @param {string} table
     * @param {any} condition
     * @return {Promise<boolean>}
     */
    public async exists(table: string, condition: any): Promise<boolean> {
        const data = await this.findOne(table, condition);

        return data !== undefined;
    }

    /**
     * Load one item from database according to the condition
     * @param {string} table
     * @param {any} condition
     * @return {Promise<{}>} data
     */
    public async load(table: string, condition: any): Promise<{}> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        const id = this.createCacheId(table, condition);
        const result = await repo.find({
            where: condition,
            take: 1,
            cache: {
                id: id,
            }
        });

        return result[0];
    }

    /**
     * Increase the number in the data according to the corresponding condition
     * @param {string} table
     * @param {any} data
     * @param {any} condition
     * @return {Promise<void>}
     */
    public async increase(table: string, data: any, condition: any): Promise<void> {
        let num: number;
        let item: any = await this.findOne(table, condition);

        // Maybe this could be deleted.
        if (!item) {
            item = await this.create(table, condition);
        }

        for (const key of Object.keys(data)) {
            num = Number(item[key]);
            num += data[key];
            const cacheData: any = {};
            cacheData[key] = num;
            await this.update(table, cacheData, condition);
            // logger.info(table + '.' + key + ' was increased by ' + data[key]);
        }

        const id = this.createCacheId(table, condition);

        const connection = getConnection();
        await connection.queryResultCache.remove([
            id, 'count' + table, 'find' + table, 'findAll' + table]);
    }

    /**
     * Check if the data exists, if it exists, load it, if not , create a new one
     * @param {string} table
     * @param {any} data
     * @return {Promise<boolean>}
     */
    public async createOrLoad(table: string, data: any): Promise<boolean> {
        const exist = await this.exists(table, data);
        if (!exist) {
            await this.create(table, data);
        }
        return true;
    }

    /**
     * Create a new row to the given talbe
     * @param {string} table
     * @param {any} data
     * @return {Promise<any>} result
     */
    public async create(table: string, data: any): Promise<any> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        const result = await repo.save(data);

        // Clear the cache
        const id = this.createCacheId(table, data);
        await connection.queryResultCache.remove([
            id, 'count' + table, 'find' + table, 'findAll' + table]);

        // logger.info('Created an item in table: ' + table);

        return result;
    }

    /**
     * Update the data in the given table according to the condition
     * @param {string} table
     * @param {any} data
     * @param {any} condition
     * @return {Promise<void>}
     */
    public async update(table: string, data: any, condition: any): Promise<void> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        await repo.update(condition, data);

        // Clear the cache
        const id = this.createCacheId(table, condition);
        await connection.queryResultCache.remove([
            id, 'count' + table, 'find' + table, 'findAll' + table]);
    }

    /**
     * Delete a row in the given table according to the condition
     * @param {string} table
     * @param {any} condition
     * @return {Promise<void>}
     */
    public async del(table: string, condition: any): Promise<void> {
        const connection = getConnection();
        const repo = connection.getRepository(ENTITY[table]);
        await repo.delete(condition);

        // Clear the cache
        const id = this.createCacheId(table, condition);
        await connection.queryResultCache.remove([
            id, 'count' + table, 'find' + table, 'findAll' + table]);
        // logger.info('Delete the data according to the condition: ' + JSON.stringify(condition));
    }

    /**
     * Begin to save the transaction to the memory
     * @param {any} transaction
     * @return {Promise<any>}
     */
    public async beginContract(transaction: any): Promise<any> {
        const connection = getConnection();
        const queryRunner = connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        await queryRunner.manager.save(Transaction, transaction);
        // logger.info('Begin a contract');
        return queryRunner;
}

    /**
     * Commit a transaction from the memory
     * @param {any} queryRunner
     * @return {Promise<void>}
     */
    public async commitContract(queryRunner: any): Promise<void> {
        try {
            await queryRunner.commitTransaction();

            // Clear the cache of transaction
            const connection = getConnection();
            const table = 'Transation';
            await connection.queryResultCache.remove([
                'count' + table, 'find' + table, 'findAll' + table]);

            // logger.info('Commit the contract');
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Rollback the transaction when error is encountered
     * @param {any} queryRunner
     * @return {Promise<void>}
     */
    public async rollbackContract(queryRunner: any): Promise<void> {
        await queryRunner.rollbackTransaction();
        // logger.info('Rollback the contract');
        await queryRunner.release();
    }

    /**
     * Lock an account
     * Entity: account, issuer, asset
     * TODO
     * @param {string} id
     */
    public async lock(id: string) {
        const addressRe = /@(.*)/g;
        const address = addressRe.exec(id)[1];

        id = id.toLowerCase();

        let table: string;
        let idx: string;
        if (id.includes('account')) {
            table = 'Account';
            idx = this.createCacheId(table, {address: address});
        } else if (id.includes('issue')) {
            table = 'Issuer';
            idx = this.createCacheId(table, {issuerId: address});
        } else if (id.includes('asset')) {
            table = 'Asset';
            idx = this.createCacheId(table, {address: address});
        } else {
            console.log({id});
            return;
        }

        const cacheIdList = [idx, 'find' + table, 'findAll' + table];
        const connection = getConnection();

        let item: any;

        for (const cacheId of cacheIdList) {
            const QueryResultCacheOptions = {
                identifier: cacheId,
                duration: 30000,
                query: '',
            };
            const cache = await connection.queryResultCache.getFromCache(QueryResultCacheOptions);
            if (cache) {
                for (item of JSON.parse(cache.result)) {
                    if (this.inCacheResult(item, address)) {
                        this.logger.error('Found in cache');
                        throw new Error('Cannot be modified');
                    }
                }
            }
        }
    }

    /**
     * Close the connection to the database
     * @return Promise<void>
     */
    public async close(): Promise<void> {
        await this.connection.close();
        this.logger.info('Close smartdb');
    }

    // Private methods

    /**
     * Create cache id
     * @return {string}
     */
    private createCacheId(table, condition: any) {
        let value: string;

        if (table == 'Round') {
            value = condition.round;
        } else if (table == 'Account') {
            value = condition.address;
        } else if (table == 'Asset') {
            value = this.getConditionValue(condition, ['name', 'issuerId']);
        } else if (table == 'Balance') {
            value = condition.address;
        } else if (table == 'Delegate') {
            value = this.getConditionValue(condition, ['username', 'address']);
        } else if (table == 'Issuer') {
            value = this.getConditionValue(condition, ['name', 'issuerId']);
        } else if (table == 'Transaction') {
            value = this.getConditionValue(condition, ['id', 'senderId']);
        } else if (table == 'Transfer') {
            value = condition.tid;
        } else if (table == 'Variable') {
            value = condition.key;
        } else if (table == 'Vote') {
            value = this.getConditionValue(condition, ['delegate', 'voterAddress']);
        } else if (table == 'Block') {
            value = condition.id;
        } else {
            value = undefined;
        }

        const id = table + '@' + value;

        return id;
    }

    /**
     * Judge an address if in the cache result
     * @return {boolean}
     */
    private inCacheResult(item: any, address) {
        const keys = ['Account_address', 'Asset_name', 'Issuer_issuerId', 'Issuer_name'];

        let key: string;
        for (key of keys) {
            if (item.hasOwnProperty(key)) {
                if (item[key] === address) {
                    return true;
                }
            }
        }
    }

    private getConditionValue(condition, keys) {
        let key: string;
        for (key of keys) {
            if (condition.hasOwnProperty(key)) {
                return condition[key];
            }
        }
    }
}

