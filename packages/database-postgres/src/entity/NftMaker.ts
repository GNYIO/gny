import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class NftMaker implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 16,
    nullable: false,
  })
  public name: string;

  @Column({
    length: 100,
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  public desc: string;

  @Column({
    length: 50,
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  public address: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  public tid: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
