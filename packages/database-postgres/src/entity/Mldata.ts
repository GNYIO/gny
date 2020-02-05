import { Column, Entity, PrimaryColumn, Timestamp } from 'typeorm';
import { Config } from '../decorator/config';

@Config({ memory: false })
@Entity()
export class Mldata {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  public address: string;
  @PrimaryColumn({
    type: 'bigint',
  })
  public id: string;

  @PrimaryColumn({
    length: 32,
    type: 'varchar',
    nullable: false,
  })
  public ProductName: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public CustomerName: string;

  @Column({
    default: String(0),
    type: 'bigint',
    nullable: false,
  })
  public PurchaseAmount: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public ProductCategory: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public ProductSubCategory1: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public ProductSubCategory2: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public PurchaseLocationStreet: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public PurchaseLocationCity: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public PurchaseLocationState: string;

  @Column({
    length: 64,
    type: 'varchar',
    nullable: false,
  })
  public PurchaseLocationZipcode: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  public PurchaseDate: Timestamp;

  @Column({
    default: 0,
    type: 'integer',
    nullable: false,
  })
  public _version_?: number;
}
