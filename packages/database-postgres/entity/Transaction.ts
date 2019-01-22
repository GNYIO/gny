import { Column, Entity, Index, PrimaryColumn, ManyToOne } from 'typeorm';
import { Block } from './Block';

@Entity()
export class Transaction {

    @PrimaryColumn({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
    public id: string;

    @Column({
        nullable: false,
    })
    @Index()
    public type: number;

    @Column({
        nullable: false,
        type: 'int',
    })
    @Index()
    public timestamp: number;

    @Column({
        length: 50,
        type: 'varchar',
        nullable: false,
    })
    @Index()
    public senderId: string;

    @Column({
        length: 64,
        type: 'varchar',
        nullable: false,
    })
    public senderPublicKey: string;

    @Column({
        nullable: false,
        type: 'bigint',
    })
    public fee: number;

    @Column({
        type: 'json',
        nullable: false,
    })
    public signatures: any;

    @Column({
        length: 128,
        nullable: true,
        type: 'varchar',
    })
    public secondSignature?: any;

    @Column({
        type: 'json',
        nullable: true,
    })
    public args: any;

    @ManyToOne(type => Block, block => block.transactions)
    public height: number;

    @Column({
        length: 256,
        type: 'varchar',
        nullable: true,
    })
    @Index()
    public message?: string;
}