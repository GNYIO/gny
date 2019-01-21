import { Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Vote {

    @PrimaryColumn({
        type: 'varchar',
        length: 50,
        nullable: false,
    })
    public address: string;

    @PrimaryColumn({
        length: 50,
        type: 'varchar',
        nullable: false,
    })
    public delegate: string;

}

// export default {
//   table: 'votes',
//   tableFields: [
//     { name: 'address', type: 'String', length: 50, not_null: true, composite_key: true },
//     { name: 'delegate', type: 'String', length: 50, not_null: true, composite_key: true },
//   ],
// };
