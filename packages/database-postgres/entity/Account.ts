import { Column, Entity, PrimaryColumn } from 'typeorm'; // PrimaryGeneratedColumn

// Lack of recipient

@Entity()
export class Account {

    @PrimaryColumn({
        type: 'varchar',
        length: 50,
        nullable: false,
        unique: true,
    })
    public address: string;

    @Column({
        length: 20,
        type: 'varchar',
        // unique: true,
        nullable: true,
    })
    public username: string;

    @Column({
        default: 0,
        type: 'bigint',
    })
    public gny: number;

    @Column({
        length: 64,
        type: String,
        nullable: true,
    })
    public publicKey: string;

    @Column({
        length: 64,
        type: String,
        nullable: true,
    })
    public secondPublicKey: string;

    @Column({
        default: 0,
        type: Number,
    })
    public isDelegate: number;

    @Column({
        default: 0,
        type: Number,
    })
    public isLocked: number;

    @Column({
        default: 0,
        type: Number,
    })
    public role: number;

    @Column({
        default: 0,
        type: 'bigint',
    })
    public lockHeight: number;

    @Column({
        default: 0,
        type: 'bigint',
    })
    public lockAmount: number;

}

// export default {
//     table: 'accounts',
//     tableFields: [
//       { name: 'address', type: 'String', length: 50, primary_key: true, not_null: true },
//       { name: 'username', type: 'String', length: 20, unique: true },
//       { name: 'gny', type: 'BigInt', default: 0 },
//       { name: 'publicKey', type: 'String', length: 64 },
//       { name: 'secondPublicKey', type: 'String', length: 64 },
//       { name: 'isDelegate', type: 'Number', default: 0 },
//       { name: 'isLocked', type: 'Number', default: 0 },
//       { name: 'role', type: 'Number', default: 0 },
//       { name: 'lockHeight', type: 'BigInt', default: 0 },
//       { name: 'lockAmount', type: 'BigInt', default: 0 },
//     ]
//   };

// export const AccountEntity = new EntitySchema({
//     name: 'account',
//     columns: {
//         address: {
//             length: 50,
//             nullable: false,
//             primary: true,
//             type: String,
//         },
//         balance: {
//             default: 0,
//             type: 'bigint',
//         },
//         isDelegate: {
//             default: 0,
//             type: Number,
//         },
//         isLocked: {
//             default: 0,
//             type: Number,
//         },
//         lockAmount: {
//             default: 0,
//             type: 'bigint',
//         },
//         lockHeight: {
//             default: 0,
//             type: 'bigint',
//         },
//         publicKey: {
//             length: 64,
//             type: String,
//         },
//         secondPublicKey: {
//             length: 64,
//             type: String,
//         },
//         username: {
//             length: 20,
//             type: String,
//             unique: true,
//         },
//     },
// });

// export default {
//     table: 'accounts',
//     tableFields: [
//       { name: 'address', type: 'String', length: 50, primary_key: true, not_null: true },
//       { name: 'username', type: 'String', length: 20, unique: true },
//       { name: 'balance', type: 'BigInt', default: 0 },
//       { name: 'publicKey', type: 'String', length: 64 },
//       { name: 'secondPublicKey', type: 'String', length: 64 },
//       { name: 'isDelegate', type: 'Number', default: 0 },
//       { name: 'isLocked', type: 'Number', default: 0 },
//       { name: 'lockHeight', type: 'BigInt', default: 0 },
//       { name: 'lockAmount', type: 'BigInt', default: 0 },
//     ]
//   };

