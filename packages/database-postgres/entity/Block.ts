import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Block {

    @PrimaryColumn({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
    public id: string;

    @Column({
        nullable: false,
        type: 'int',
    })
    @Index()
    public timestamp: number;

    @Column({
        nullable: false,
        type: 'bigint',
    })
    public height: number;

    @Column({
        length: 64,
        nullable: true,
        type: 'varchar',
    })
    @Index()
    public previousBlock?: any;

    @Column({
        nullable: false,
        type: 'int',
    })
    public count: number;

    // @Column({
    //     nullable: false,
    //     type: 'bigint',
    // })
    // public totalAmount: number;

    @Column({
        nullable: false,
        type: 'bigint',
    })
    public fees: number;

    @Column({
        nullable: false,
        type: 'bigint',
    })
    public reward: number;

    // @Column({
    //     nullable: false,
    //     type: Number,
    // })
    // public payloadLength: number;

    @Column({
        length: 64,
        nullable: false,
        type: 'varchar',
    })
    public payloadHash: string;

    // @Column({
    //     length: 32,
    //     nullable: false,
    //     type: 'varchar',
    // })
    // public generatorPublicKey: string;

    @Column({
        length: 128,
        nullable: false,
        type: 'varchar',
    })
    public signature: string;

    @Column({
        type: 'int',
    })
    public version: number;

    @Column({
        length: 64,
        nullable: false,
        type: 'varchar',
    })
    public delegate: string;

    @Column({
        type: 'json',
    })
    public transactions: any;
}

// export default {
//   table: 'blocks',
//   tableFields: [
//     { name: 'id', type: 'String', length: 64, not_null: true, primary_key: true },
//     { name: 'timestamp', type: 'Number', not_null: true },
//     { name: 'height', type: 'BigInt', not_null: true },
//     { name: 'previousBlockId', type: 'String', length: 64, not_null: true, index: true },
//     { name: 'numberOfTransactions', type: 'Number', not_null: true },
//     { name: 'totalAmount', type: 'BigInt', not_null: true },
//     { name: 'totalFee', type: 'BigInt', not_null: true },
//     { name: 'reward', type: 'BigInt', not_null: true },
//     { name: 'payloadLength', type: 'Number', not_null: true },
//     { name: 'payloadHash', type: 'String', length: 32, not_null: true },
//     { name: 'generatorPublicKey', type: 'String', length: 32, not_null: true},
//     { name: 'signature', type: 'String', length: 64, not_null: true }
//   ]
// };
