import { Column, Entity, PrimaryColumn } from 'typeorm'; // PrimaryGeneratedColumn

@Entity()
export class Round {

    // @PrimaryGeneratedColumn()
    // public id: number;

    @PrimaryColumn({
        type: 'bigint',
    })
    public round: number; // If this column  should be modified to PrimaryGeneratedColumn?

    @Column({
        type: 'bigint',
        nullable: true,
        default: 0,
    })
    public fee: number;

    @Column({
        type: 'bigint',
        nullable: true,
        default: 0,
    })
    public reward: number;
}

// export default {
//   table: 'rounds',
//   tableFields: [
//     { name: 'round', type: 'BigInt', primary_key: true },
//     { name: 'fee', type: 'BigInt', not_null: true },
//     { name: 'reward', type: 'BigInt', not_null: true },
//   ],
// };
