import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { Versioned } from '../searchTypes';

@Config({ memory: true })
@Entity()
export class Balance implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  @Index()
  public address: string;

  @PrimaryColumn({
    length: 30,
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public currency: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  public balance: string;

  @Column()
  @Index()
  public flag: number;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
