import { Column, Entity, Index, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Transfer {

    @PrimaryGeneratedColumn()
    public id: number;

    @PrimaryColumn({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
    public transactionId: string;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
    })
    @Index()
    public senderId: string;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    @Index()
    public recipientId: string;

    @Column({
        length: 30,
        type: String,
        nullable: true,
    })
    public recipientName: string;

    @Column({
        type: 'varchar',
        length: 30,
        nullable: false,
    })
    @Index()
    public currency: string;

    @Column({
        type: 'varchar',
        length: 30,
        nullable: false,
    })
    public amount: string;

    @Column()
    @Index()
    public timestamp: number;

    @Column({
        nullable: false,
        type: 'bigint',
    })
    @Index()
    public height: number;

}

// export default {
//   table: 'transfers',
//   tableFields: [
//     { name: 'transactionId', type: 'String', length: 64, not_null: true, primary_key: true },
//     { name: 'senderId', type: 'String', length: 50, not_null: true, index: true },
//     { name: 'recipientId', type: 'String', length: 50, not_null: true, index: true },
//     { name: 'recipientName', type: 'String', length: 30 },
//     { name: 'currency', type: 'String', length: 30, not_null: true, index: true },
//     { name: 'amount', type: 'String', length: 50, not_null: true },
//     { name: 'timestamp', type: 'Number', index: true },
//     { name: 'height', type: 'BigInt', not_null: true, index: true },
//   ],
// };
