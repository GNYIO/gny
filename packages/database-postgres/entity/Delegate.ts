import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Delegate {

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
        nullable: false,
    })
    public tid: string;

    @Column({
        length: 50,
        type: 'varchar',
        nullable: false,
        unique: true,
    })
    public username: string;

    @Column({
        length: 64,
        type: String,
        unique: true,
        nullable: false,
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