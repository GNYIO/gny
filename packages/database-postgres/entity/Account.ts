import { Column, Entity, PrimaryColumn } from 'typeorm';

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
        length: 30,
        type: 'varchar',
        nullable: true,
        unique: true,
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
        type: 'bigint',
    })
    public lockHeight: number;

    @Column({
        default: 0,
        type: 'bigint',
    })
    public lockAmount: number;
}