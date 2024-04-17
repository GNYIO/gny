import { Column, Entity, PrimaryColumn, Index } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class Verification implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 128,
    nullable: false,
  })
  public identifier: string;

  @Column({
    length: 128,
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public tid: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @Index()
  public senderId: string;

  @Column({
    length: 128,
    nullable: false,
    type: 'varchar',
  })
  public signature: string;

  @Column({
    nullable: false,
    type: 'int',
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  @Index()
  public height: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
