import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class NftTransfer implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  public tid: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @Index()
  public senderId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @Index()
  public recipientId: string;

  @Column({
    length: 50,
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public nftName: string;

  @Column({
    type: 'int',
  })
  @Index()
  public timestamp: number;

  @Column({
    nullable: false,
    type: 'bigint',
  })
  @Index()
  public height: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
