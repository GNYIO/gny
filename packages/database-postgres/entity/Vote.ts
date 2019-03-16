import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Vote {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  public voterAddress: string;

  @PrimaryColumn({
    length: 50,
    type: 'varchar',
    nullable: false,
  })
  public delegate: string;

  @Column({
    default: 0,
    type: 'bigint',
    nullable: false,
  })
  public _version_: number;
}
