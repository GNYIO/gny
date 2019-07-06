import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: true })
@Entity()
export class Asset {
  // @PrimaryColumn({
  //   type: 'varchar',
  //   length: 50,
  // })
  // public organization: string;

  @PrimaryColumn({
    type: 'varchar',
    length: 50,
  })
  public name: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  public tid: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  @Index()
  public maximum: number;

  @Column({
    type: Number,
    nullable: false,
  })
  public precision: number;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  public quantity: number;

  @Column({
    type: 'text',
  })
  public desc: string;

  @Column({
    length: 50,
    type: 'varchar',
    nullable: false,
  })
  public issuerId: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_: number;
}
