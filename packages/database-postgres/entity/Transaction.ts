import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Transaction {

    @PrimaryColumn({
        type: 'varchar',
        length: 64,
        nullable: false,
    })
    public id: string;

    @Column({
        nullable: false,
        // unique: true,
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
        length: 29,
        type: String,
        nullable: true,
    })
    @Index()
    public senderId: string;

    @Column({
        length: 64,
        type: String,
        nullable: true,
    })
    public senderPublicKey: string;

    @Column({
        nullable: false,
        type: 'bigint',
    })
    public fee: number;

    @Column({
        type: 'jsonb',
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
      type: 'jsonb',
      nullable: true,
  })
  public args: any;

    @Column({
        type: 'bigint',
        nullable: true,
    })
    @Index()
    public height?: number;

    @Column({
        length: 256,
        type: 'varchar',
        nullable: true,
     })
     @Index()
    public message?: string;

}

// export default {
//   table: 'transactions',
//   tableFields: [
//     { name: 'id', type: 'String', length: 64, not_null: true, primary_key: true },
//     { name: 'type', type: 'Number', not_null: true, index: true },
//     { name: 'timestamp', type: 'Number', not_null: true, index: true },
//     { name: 'senderId', type: 'String', length: 50, index: true },
//     { name: 'senderPublicKey', type: 'String', length: 64 },
//     { name: 'fee', type: 'BigInt', not_null: true },
//     { name: 'signatures', type: 'Json', not_null: true },
//     { name: 'secondSignature', type: 'String', length: 128 },
//     { name: 'args', type: 'Json' },
//     { name: 'height', type: 'BigInt', not_null: true, index: true },
//     { name: 'message', type: 'String', length: 256, index: true },
//   ],
// };
