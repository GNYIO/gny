import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config.js';
import { Versioned } from '../searchTypes.js';

@Config({ memory: false })
@Entity()
export class Transaction implements Versioned {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  public id: string;

  @Column({
    type: 'integer',
    nullable: false,
  })
  @Index()
  public type: number;

  @Column({
    nullable: false,
    type: 'int',
  })
  @Index()
  public timestamp: number;

  @Column({
    length: 50,
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public senderId: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public senderPublicKey: string;

  @Column({
    nullable: false,
    type: 'bigint',
  })
  public fee: string;

  @Column({
    length: 164,
    type: 'varchar',
    nullable: false,
  })
  public signatures: any;

  @Column({
    length: 128,
    nullable: true,
    type: 'varchar',
  })
  public secondSignature?: any;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  public args: any;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  public height: string;

  @Column({
    length: 256,
    type: 'varchar',
    nullable: true,
  })
  @Index()
  public message?: string;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
