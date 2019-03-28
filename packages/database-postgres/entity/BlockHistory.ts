import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class BlockHistory {
  @PrimaryColumn({
    nullable: false,
    type: 'int',
  })
  public height: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public history: string;
}
