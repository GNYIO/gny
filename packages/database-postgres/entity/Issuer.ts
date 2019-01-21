import { Column, Entity, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Issuer {

    @PrimaryGeneratedColumn()
    public id: number;

    @PrimaryColumn({
        length: 32,
        type: 'varchar',
    })
    public username: string;

    @Column({
        length: 64,
        type: 'varchar',
        unique: true,
    })
    public transactionId: string;

    @Column({
        length: 50,
        type: 'varchar',
        unique: true,
    })
    public issuerId: string;

    @Column({
        type: 'text',
    })
    public description: string;
}

// export default {
//   table: 'issuers',
//   tableFields: [
//     { name: 'transactionId', type: 'String', length: 64, unique: true },
//     { name: 'username', type: 'String', length: 32, primary_key: true },
//     { name: 'issuerId', type: 'String', length: 50, unique: true },
//     { name: 'description', type: 'Text' },
//   ],
// };
