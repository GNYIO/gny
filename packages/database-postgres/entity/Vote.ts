import { Entity, PrimaryColumn, Column } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class Vote {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  public voterAddress: string;

  @PrimaryColumn({
    length: 50,
    type: 'varchar',
    nullable: false,
  })
  public delegate: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
