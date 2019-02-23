import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Balance {

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
        type: 'bigint',
        nullable: false,
    })
    public balance: number;

    @Column()
    @Index()
    public flag: number;

}