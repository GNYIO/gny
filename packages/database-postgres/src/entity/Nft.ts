import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class Nft implements Versioned {
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
  public cid: string;

  @Column({
    length: 50,
    type: 'varchar',
    nullable: true,
    unique: false,
  })
  public prevNft: string;

  @Column({
    length: 20,
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  public makerId: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
