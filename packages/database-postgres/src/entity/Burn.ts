import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class Burn implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  public tid: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @Index()
  public senderId: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  public amount: string;

  @Column({
    nullable: false,
    type: 'bigint',
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
