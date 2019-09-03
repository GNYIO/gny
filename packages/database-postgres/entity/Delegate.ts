import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { Versioned } from '../src/searchTypes';

@Config({ memory: true })
@Entity()
export class Delegate implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
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
  public votes: string;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  public producedBlocks: string;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  public missedBlocks: string;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  public fees: string;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  public rewards: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
