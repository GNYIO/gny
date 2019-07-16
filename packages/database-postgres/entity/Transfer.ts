import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class Transfer {
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
    length: 30,
    type: 'varchar',
    nullable: true,
  })
  public recipientName: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
  })
  @Index()
  public currency: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  public amount: string;

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
