import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class Round {
  @PrimaryColumn({
    type: 'bigint',
  })
  public round: string;

  @Column({
    type: 'bigint',
    nullable: true,
    default: String(0),
  })
  public fee: string;

  @Column({
    type: 'bigint',
    nullable: true,
    default: String(0),
  })
  public reward: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
