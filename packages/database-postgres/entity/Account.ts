import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { BigNumberTransformerNullable } from '../BigNumberTransformer';
import { BigNumber } from 'bignumber.js';

@Config({ memory: false })
@Entity()
export class Account {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
    nullable: false,
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
    transformer: new BigNumberTransformerNullable(),
  })
  public gny: BigNumber;

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
    transformer: new BigNumberTransformerNullable(),
  })
  public lockHeight: BigNumber;

  @Column({
    default: 0,
    type: 'bigint',
    transformer: new BigNumberTransformerNullable(),
  })
  public lockAmount: BigNumber;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_: number;
}
