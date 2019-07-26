import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';
import { Versioned } from '../searchTypes';

@Config({ memory: false })
@Entity()
export class Issuer implements Versioned {
  @PrimaryColumn({
    length: 32,
    type: 'varchar',
    nullable: false,
  })
  public name: string;

  @Column({
    length: 64,
    type: 'varchar',
    unique: true,
  })
  public tid: string;

  @Column({
    length: 50,
    type: 'varchar',
    unique: true,
    nullable: false,
  })
  public issuerId: string;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 4096,
  })
  public desc: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
