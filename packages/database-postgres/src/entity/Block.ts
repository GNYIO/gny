import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { Versioned } from '../searchTypes';
import { ITransaction } from '@gny/interfaces';

@Config({ memory: false })
@Entity()
export class Block implements Versioned {
  [index: string]: string | number | ITransaction[] | undefined;
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
    type: 'bigint',
    unique: true,
  })
  public height: string;

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
  public fees: string;

  @Column({
    nullable: false,
    type: 'bigint',
  })
  public reward: string;

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
  public _version_?: number;
}
