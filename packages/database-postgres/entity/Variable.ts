import { Column, Entity, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Variable {

    @PrimaryGeneratedColumn()
    public id: number;

    @PrimaryColumn({
        type: 'varchar',
        length: 256,
        nullable: false,
    })
    public key: string;

    @Column({
        type: 'text',
        nullable: false,
    })
    public value: string;

}

// export default {
//   table: 'variables',
//   memory: true, ????
//   tableFields: [
//     {
//       name: 'key',
//       type: 'String',
//       length: 256,
//       not_null: true,
//       primary_key: true,
//     },
//     {
//       name: 'value',
//       type: 'Text',
//       not_null: true,
//     },
//   ],
// };
