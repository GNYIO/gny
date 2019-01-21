import { Column, Entity, Index , PrimaryGeneratedColumn } from 'typeorm';


@Entity()
export class Asset {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column({
        type: 'varchar',
        length: 50,
        primary: true,
    })
    public name: string;

    @Column({
        length: 64,
        type: 'varchar',
        nullable: false,
        unique: true,
    })
    public transactionId: string;

    @Column({
        type: 'timestamp',
        nullable: false,
    })
    @Index()
    public timestamp: number;

    @Column({
        length: 50,
        type: String,
        nullable: false,
    })
    @Index()
    public maximum: string;

    @Column({
        type: Number,
    })
    public precision: number;

    @Column({
        length: 50,
        type: 'varchar',
    })
    public quantity: string;

    @Column({
        type: 'text',
    })
    public description: string;

    @Column({
        length: 50,
        type: 'varchar',
    })
    public issuerId: string;

}

// export default {
//   table: 'assets',
//   memory: true,
//   tableFields: [
//     { name: 'name', type: 'String', length: 50, primary_key: true },
//     { name: 'transactionId', type: 'String', length: 64, not_null: true, unique: true },
//     { name: 'timestamp', type: 'Number', not_null: true, index: true },
//     { name: 'maximum', type: 'String', length: 50, not_null: true, index: true },
//     { name: 'precision', type: 'Number' },
//     { name: 'quantity', type: 'String', length: 50 },
//     { name: 'description', type: 'Text' },
//     { name: 'issuerId', type: 'String', length: 50 },
//   ],
// };
