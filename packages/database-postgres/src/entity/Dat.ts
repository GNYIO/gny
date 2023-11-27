import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class Dat implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  public name: string;

  @Column({
    length: 60,
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  public hash: string;

  @Column({
    length: 60,
    type: 'varchar',
    nullable: true,
  })
  public previousHash: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  public tid: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  @Index()
  public counter: string;

  @Column({
    length: 20,
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public datMakerId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @Index()
  public ownerAddress: string;

  @Column({
    type: 'int',
  })
  public timestamp: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @Index()
  public url: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
