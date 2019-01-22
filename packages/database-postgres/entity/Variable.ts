import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Variable {

    @PrimaryColumn({
        type: 'varchar',
        length: 256,
        nullable: false,
    })
    public key: string;

    @Column({
        type: 'text',
        nullable: false,
    })
    public value: string;
}