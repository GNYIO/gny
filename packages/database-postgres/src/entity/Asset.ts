import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: true })
@Entity()
export class Asset implements Versioned {
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
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  @Index()
  public maximum: string;

  @Column({
    type: Number,
    nullable: false,
  })
  public precision: number;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  public quantity: string;

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
  public _version_?: number;
}
