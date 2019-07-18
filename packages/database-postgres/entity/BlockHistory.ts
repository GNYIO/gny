import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class BlockHistory {
  @PrimaryColumn({
    nullable: false,
    type: 'bigint',
  })
  public height: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public history: string;
}
