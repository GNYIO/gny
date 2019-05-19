import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class Mldata {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({
    length: 30,
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  public username: string;

  @Column({
    default: 0,
    type: 'bigint',
    nullable: false,
  })
  public _version_: number;
}
