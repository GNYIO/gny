import { getConnection } from 'typeorm';

export function toArray(arr) {
  if (Array.isArray(arr)) {
    let i = 0;
    const arr2 = Array(arr.length);
    for (; i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
  }
}



import { Account } from '../../entity/Account';
import { Asset } from '../../entity/Asset';
import { Balance } from '../../entity/Balance';
import { Block } from '../../entity/Block';
import { Delegate } from '../../entity/Delegate';
import { Issuer } from '../../entity/Issuer';
import { Round } from '../../entity/Round';
import { Transaction } from '../../entity/Transaction';
import { Transfer } from '../../entity/Transfer';
import { Variable } from '../../entity/Variable';
import { Vote } from '../../entity/Vote';
import { ModelSchema } from '../modelSchema';


const ENTITY: any = {
  'Account': Account,
  'Asset': Asset,
  'Balance': Balance,
  'Block': Block,
  'Delegate': Delegate,
  'Issuer': Issuer,
  'Round': Round,
  'Transaction': Transaction,
  'Variable': Variable,
  'Vote': Vote,
  'Transfer': Transfer
};


export function loadSchemas () {
  const schemas = new Map<string, ModelSchema>();
  Object.keys(ENTITY).forEach((name) => {
    const newSchema = new ModelSchema(ENTITY[name], name);
    schemas.set(name, newSchema);
  });

  return schemas;
}


// {
//   "schema": {
//     "table": "accounts",
//     "tableFields": [
//       {
//         "name": "address",
//         "type": "String",
//         "length": 50,
//         "primary_key": true,
//         "not_null": true
//       },
//       {
//         "name": "username",
//         "type": "String",
//         "length": 20,
//         "unique": true
//       },
//       {
//         "name": "gny",
//         "type": "BigInt",
//         "default": 0
//       },
//       {
//         "name": "publicKey",
//         "type": "String",
//         "length": 64
//       },
//       {
//         "name": "secondPublicKey",
//         "type": "String",
//         "length": 64
//       },
//       {
//         "name": "isDelegate",
//         "type": "Number",
//         "default": 0
//       },
//       {
//         "name": "isLocked",
//         "type": "Number",
//         "default": 0
//       },
//       {
//         "name": "lockHeight",
//         "type": "BigInt",
//         "default": 0
//       },
//       {
//         "name": "lockAmount",
//         "type": "BigInt",
//         "default": 0
//       },
//       {
//         "name": "_version_",
//         "type": "Number",
//         "default": 0
//       }
//     ]
//   },
//   "name": "Account",
//   "memory": false,
//   "readonly": false,
//   "local": false,
//   "propertiesSet": {},
//   "uniquePropertiesSet": {},
//   "compositKeyProperties": [],
//   "primaryKeyProperty": "address",
//   "allPropertyTypes": {},
//   "allProperties": [
//     "address",
//     "username",
//     "gny",
//     "publicKey",
//     "secondPublicKey",
//     "isDelegate",
//     "isLocked",
//     "lockHeight",
//     "lockAmount",
//     "_version_"
//   ],
//   "allJsonProperties": [],
//   "allNormalIndexes": [],
//   "allUniqueIndexes": [
//     {
//       "name": "username",
//       "properties": [
//         "username"
//       ]
//     }
//   ]
// }"