import { Column, Entity, Index , PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Balance {

    @PrimaryGeneratedColumn()
    public id: number;

    @PrimaryColumn({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
    @Index()
    public address: string;

    @PrimaryColumn({
        length: 30,
        type: 'varchar',
        nullable: false,
    })
    @Index()
    public currency: string;

    @Column({
        length: 50,
        type: 'varchar',
        nullable: false,
    })
    public balance: string;

    @Column()
    @Index()
    public flag: number;

}

// export default {
//   table: 'balances',
//   memory: true,
//   tableFields: [
//     { name: 'address', type: 'String', length: 64, not_null: true, composite_key: true, index: true },
//     { name: 'currency', type: 'String', length: 30, not_null: true, composite_key: true, index: true },
//     { name: 'balance', type: 'String', length: 50, not_null: true },
//     { name: 'flag', type: 'Number', index: true },
//   ],
// };
