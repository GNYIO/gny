import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class Round {
  @PrimaryColumn({
    type: 'bigint',
  })
  public round: number;

  @Column({
    type: 'bigint',
    nullable: true,
    default: 0,
  })
  public fee: number;

  @Column({
    type: 'bigint',
    nullable: true,
    default: 0,
  })
  public reward: number;

  @Column({
    default: 0,
    type: 'bigint',
    nullable: false,
  })
  public _version_: number;
}
