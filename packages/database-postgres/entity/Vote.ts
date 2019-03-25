import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Vote {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
    nullable: false
  })
  public voterAddress: string;

  @PrimaryColumn({
    length: 50,
    type: 'varchar',
    nullable: false
  })
  public delegate: string;
}
