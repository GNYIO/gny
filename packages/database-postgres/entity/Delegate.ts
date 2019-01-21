import { Column, Entity, Index , PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Delegate {

    @PrimaryGeneratedColumn()
    public id: number;

    @PrimaryColumn({
        type: 'varchar',
        length: 50,
        unique: true,
        nullable: false,
    })
    public address: string;

    @Column({
        length: 64,
        type: 'varchar',
        unique: true,
        nullable: true,
    })
    public transactionId: string;

    @Column({
        length: 50,
        type: 'varchar',
        nullable: true,
        unique: true,
    })
    public username: string;

    @Column({
        length: 64,
        type: String,
        unique: true,
        nullable: true,
    })
    public publicKey: string;

    @Column({
        type: 'bigint',
        nullable: true,
    })
    @Index()
    public votes: number;

    @Column({
        type: 'bigint',
        nullable: true,
    })
    public producedBlocks: number;

    @Column({
        type: 'bigint',
        nullable: true,
    })
    public missedBlocks: number;

    @Column({
        type: 'bigint',
        nullable: true,
    })
    public fees: number;

    @Column({
        type: 'bigint',
        nullable: true,
    })
    public rewards: number;

}

// export default {
//   table: 'delegates',
//   memory: true,
//   tableFields: [
//     { name: 'address', type: 'String', length: 50, primary_key: true, not_null: true },
//     { name: 'transactionId', type: 'String', length: 64, unique: true, not_null: true },
//     { name: 'username', type: 'String', length: 50, unique: true },
//     { name: 'publicKey', type: 'String', length: 64, unique: true },
//     { name: 'votes', type: 'BigInt', index: true },
//     { name: 'producedBlocks', type: 'BigInt' },
//     { name: 'missedBlocks', type: 'BigInt' },
//     { name: 'fees', type: 'BigInt' },
//     { name: 'rewards', type: 'BigInt' },
//   ],
// };
