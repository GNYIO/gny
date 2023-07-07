import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';

@Config({ memory: true })
@Entity()
export class Prediction {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  @Index()
  public address: string;

  @Column({
    length: 1024,
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public prediction: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
