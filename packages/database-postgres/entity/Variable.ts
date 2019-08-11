import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { Versioned } from '../searchTypes';

@Config({ memory: true })
@Entity()
export class Variable implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 256,
    nullable: false,
  })
  public key: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  public value: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
