import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { Versioned } from '../src/searchTypes';

@Config({ memory: false })
@Entity()
export class BlockHistory implements Versioned {
  @PrimaryColumn({
    nullable: false,
    type: 'bigint',
  })
  public height: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public history: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
