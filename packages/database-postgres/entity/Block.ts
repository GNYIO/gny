import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import BigNumber from 'bignumber.js';
import { BigNumberTransformer } from '../BigNumberTransformer';

@Config({ memory: false })
@Entity()
export class Block {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  public id: string;

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
    nullable: false,
    type: 'int',
    unique: true,
  })
  public height: number;

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
    transformer: new BigNumberTransformer(),
  })
  public fees: BigNumber;

  @Column({
    nullable: false,
    type: 'bigint',
    transformer: new BigNumberTransformer(),
  })
  public reward: BigNumber;

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

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_: number;
}
