import { Column, Entity, Index, PrimaryColumn, OneToMany } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class Block {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  public id: string;

  @PrimaryColumn({
    nullable: false,
    type: 'bigint',
  })
  public height: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  public version: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  @Index()
  public timestamp: number;

  @Column({
    length: 64,
    nullable: true,
    type: 'varchar',
  })
  @Index()
  public prevBlockId?: any;

  @Column({
    nullable: false,
    type: 'int',
  })
  public count: number;

  @Column({
    nullable: false,
    type: 'bigint',
  })
  public fees: number;

  @Column({
    nullable: false,
    type: 'bigint',
  })
  public reward: number;

  @Column({
    length: 64,
    nullable: false,
    type: 'varchar',
  })
  public payloadHash: string;

  @Column({
    length: 64,
    nullable: false,
    type: 'varchar',
  })
  public delegate: string;

  @Column({
    length: 128,
    nullable: false,
    type: 'varchar',
  })
  public signature: string;

  @OneToMany(type => Transaction,
    transaction => transaction.height, {
    cascade: ['remove'],
  })
  public transactions: Transaction[];
}
