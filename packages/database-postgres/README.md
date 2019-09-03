
# SDB (Database Layer with inbuilt Cache)

## Overview
This package is a database abstraction. In the following we will call this package `sdb`. Sdb helds _most_ of its data in memory and so saves round trips to the database. `Sdb` is intended to be used with smart contracts because it is able to `rollback` changes made by smart contract calls. But more on this later.


# Configuration

The constructor has the following signature:

```ts
constructor(logger: ILogger, options?: SmartDBOptions)
```

So you need to at least provide an logger. The `SmartDBOptions` interface has the following structure:

```ts
interface SmartDBOptions {
  // keep x last blocks in cache, default 10
  cachedBlockCount?: number;
  // checks if properties are correct in update(), default undefined
  checkModifier?: boolean;
  // stringified (JSON.stringify()) config
  configRaw: string;
}
```



## Life Cycle
Like a blockchain, `sdb` uses a form of [Event Sourcing](https://de.wikipedia.org/wiki/Event_Sourcing) where every change in a data model is represented as a delta (`a -> a'`). That makes it possible to `rollback` to a previous point in time.

### Block life cycle

Changes to the underlying data model are grouped by `Blocks`. Every `Block` has its transactions that call smart contracts and these smart contract calls produce the `deltas`.

An example block:
```json
{
  "version": 0,
  "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "timestamp": 0,
  "prevBlockId": "c35e589dda915d150650dea409f6e92a83bae4a70273a5e29e1e6751310c95d0",
  "delegate": "e43bb2cc9d5591d00344c1c49b99b6404a73fd98380386276670a0111a72c6fc",
  "height": "10",
  "count": 2,
  "fees": "510000000",
  "reward": "0",
  "signature": "c69c57fdb40a1b378c8c8456e52657ae8041a65d895e438782d71c6b7a7115d03d48cf1628a11cdfd302b22771009d902628c8882d97f9865d3bf36a1ecec306",
  "id": "6a478f6e34442a090c868d6285d4ee07f8e13dad682eff3ebd38d3021e36b706"
  // transactions property is further below
}
```

This are the transactions of the `Block` above:
```json
{
  "transactions": [
    {
      "type":0,
      "timestamp":23708761,
      "fee":"10000000",
      "message":"",
      "args":"[500000000,\"GuQr4DM3aiTD36EARqDpbfsEHoNF\"]",
      "senderPublicKey":"575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b","senderId":"G4GDW6G78sgQdSdVAQUXdm5xPS13t",
      "signatures":"[\"842921a4788007c38fad7ce82425fe7e1e9dfa1e367002a596583f06db4ff9019eb669217272466c7258ed4251d552a20a226a86a1cc70c70acfb4ed7ce71d0a\"]",
      "id":"4c5511362b2b75a6e61e028c379c2ea75b515e06ae6955c60579d04d41b7d2df",
      "height":"10",
      "_version_":1
    }, {
      "type":1,
      "timestamp":23708767,
      "fee":"500000000",
      "args":"[\"liangpeili\"]",
      "senderPublicKey":"575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b",
      "senderId":"G4GDW6G78sgQdSdVAQUXdm5xPS13t",
      "signatures":"[\"f1d50b00c1a8fb38d3e68f300a101c0537a350c3f10b1a084afb4acac7fae99c8a4613d9e44fa0d1c3df3f985c02d35b9d476f8cb5f3731fb34e0ede263db008\"]",
      "id":"fdd1be8a774e3b1537124656f9037cdcfa2b5dddfa26fd24fecaa9a0f1b2b995",
      "height":"10",
      "_version_":1
    }
  ]
}
```

The `Transactions` above would call the following smart contracts:
- `basic.transfer` (type: 0)
- `basic.setUserName` (type: 1)

The whole `Block` would then produce the following `deltas` (from which SQL statements can be generated):

<details><summary>CLICK ME</summary>

```json
[
  {
    "type": 2,
    "model": "Account",
    "primaryKey": {
      "address": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
    },
    "dbVersion": 2,
    "propertyChanges": [
      {
        "name": "gny",
        "current": "39999999990000000",
        "original": "40000000000000000"
      },
      {
        "name": "_version_",
        "current": 2,
        "original": 1
      }
    ]
  },
  {
    "type": 1,
    "model": "Account",
    "primaryKey": {
      "address": "GuQr4DM3aiTD36EARqDpbfsEHoNF"
    },
    "dbVersion": 1,
    "propertyChanges": [
      {
        "name": "address",
        "current": "GuQr4DM3aiTD36EARqDpbfsEHoNF"
      },
      {
        "name": "gny",
        "current": "500000000"
      },
      {
        "name": "username",
        "current": null
      },
      {
        "name": "isDelegate",
        "current": 0
      },
      {
        "name": "isLocked",
        "current": 0
      },
      {
        "name": "lockHeight",
        "current": "0"
      },
      {
        "name": "lockAmount",
        "current": "0"
      },
      {
        "name": "_version_",
        "current": 1
      }
    ]
  },
  {
    "type": 2,
    "model": "Account",
    "primaryKey": {
      "address": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
    },
    "dbVersion": 3,
    "propertyChanges": [
      {
        "name": "gny",
        "current": "39999999490000000",
        "original": "39999999990000000"
      },
      {
        "name": "_version_",
        "current": 3,
        "original": 2
      }
    ]
  },
  {
    "type": 1,
    "model": "Transfer",
    "primaryKey": {
      "tid": "4c5511362b2b75a6e61e028c379c2ea75b515e06ae6955c60579d04d41b7d2df"
    },
    "dbVersion": 1,
    "propertyChanges": [
      {
        "name": "tid",
        "current": "4c5511362b2b75a6e61e028c379c2ea75b515e06ae6955c60579d04d41b7d2df"
      },
      {
        "name": "height",
        "current": "10"
      },
      {
        "name": "senderId",
        "current": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
      },
      {
        "name": "recipientId",
        "current": "GuQr4DM3aiTD36EARqDpbfsEHoNF"
      },
      {
        "name": "recipientName",
        "current": null
      },
      {
        "name": "currency",
        "current": "GNY"
      },
      {
        "name": "amount",
        "current": "500000000"
      },
      {
        "name": "timestamp",
        "current": 23708761
      },
      {
        "name": "_version_",
        "current": 1
      }
    ]
  },
  {
    "type": 2,
    "model": "Account",
    "primaryKey": {
      "address": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
    },
    "dbVersion": 4,
    "propertyChanges": [
      {
        "name": "gny",
        "current": "39999998990000000",
        "original": "39999999490000000"
      },
      {
        "name": "_version_",
        "current": 4,
        "original": 3
      }
    ]
  },
  {
    "type": 2,
    "model": "Account",
    "primaryKey": {
      "address": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
    },
    "dbVersion": 5,
    "propertyChanges": [
      {
        "name": "username",
        "current": "liangpeili",
        "original": null
      },
      {
        "name": "_version_",
        "current": 5,
        "original": 4
      }
    ]
  },
  {
    "type": 1,
    "model": "Transaction",
    "primaryKey": {
      "id": "4c5511362b2b75a6e61e028c379c2ea75b515e06ae6955c60579d04d41b7d2df"
    },
    "dbVersion": 1,
    "propertyChanges": [
      {
        "name": "type",
        "current": 0
      },
      {
        "name": "timestamp",
        "current": 23708761
      },
      {
        "name": "fee",
        "current": "10000000"
      },
      {
        "name": "message",
        "current": ""
      },
      {
        "name": "args",
        "current": "[500000000,\"GuQr4DM3aiTD36EARqDpbfsEHoNF\"]"
      },
      {
        "name": "senderPublicKey",
        "current": "575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b"
      },
      {
        "name": "senderId",
        "current": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
      },
      {
        "name": "signatures",
        "current": "[\"842921a4788007c38fad7ce82425fe7e1e9dfa1e367002a596583f06db4ff9019eb669217272466c7258ed4251d552a20a226a86a1cc70c70acfb4ed7ce71d0a\"]"
      },
      {
        "name": "id",
        "current": "4c5511362b2b75a6e61e028c379c2ea75b515e06ae6955c60579d04d41b7d2df"
      },
      {
        "name": "height",
        "current": "10"
      },
      {
        "name": "_version_",
        "current": 1
      }
    ]
  },
  {
    "type": 1,
    "model": "Transaction",
    "primaryKey": {
      "id": "fdd1be8a774e3b1537124656f9037cdcfa2b5dddfa26fd24fecaa9a0f1b2b995"
    },
    "dbVersion": 1,
    "propertyChanges": [
      {
        "name": "type",
        "current": 1
      },
      {
        "name": "timestamp",
        "current": 23708767
      },
      {
        "name": "fee",
        "current": "500000000"
      },
      {
        "name": "args",
        "current": "[\"liangpeili\"]"
      },
      {
        "name": "senderPublicKey",
        "current": "575bf8f32b941b9e6ae1af82539689198327b73d77d22a98cdef2460c9257f7b"
      },
      {
        "name": "senderId",
        "current": "G4GDW6G78sgQdSdVAQUXdm5xPS13t"
      },
      {
        "name": "signatures",
        "current": "[\"f1d50b00c1a8fb38d3e68f300a101c0537a350c3f10b1a084afb4acac7fae99c8a4613d9e44fa0d1c3df3f985c02d35b9d476f8cb5f3731fb34e0ede263db008\"]"
      },
      {
        "name": "id",
        "current": "fdd1be8a774e3b1537124656f9037cdcfa2b5dddfa26fd24fecaa9a0f1b2b995"
      },
      {
        "name": "height",
        "current": "10"
      },
      {
        "name": "_version_",
        "current": 1
      }
    ]
  },
  {
    "type": 2,
    "model": "Delegate",
    "primaryKey": {
      "address": "G3bh654XQD3V6TP5aH4KspdPybYgX"
    },
    "dbVersion": 2,
    "propertyChanges": [
      {
        "name": "producedBlocks",
        "current": "1",
        "original": "0"
      },
      {
        "name": "_version_",
        "current": 2,
        "original": 1
      }
    ]
  },
  {
    "type": 2,
    "model": "Round",
    "primaryKey": {
      "round": "1"
    },
    "dbVersion": 2,
    "propertyChanges": [
      {
        "name": "fee",
        "current": "510000000",
        "original": "0"
      },
      {
        "name": "_version_",
        "current": 2,
        "original": 1
      }
    ]
  }
]
```
</details>




### Version Column
Every Entity has a `_version_` column which specifies how often it was updated.

An `Account` Entity (version 1):
| address | gny | username | version |
| :--: | :--: | :--: | :--: |
| G45U8A2vdp5CHZ3ABAZwojxdBp44p | 39999998990000000 | null | 1 |

An `Account` Entity (version 2) where the `username` was set:
| address | gny | username | version |
| :--: | :--: | :--: | :--: |
| G45U8A2vdp5CHZ3ABAZwojxdBp44p | 39999998990000000 | liangpeili | 2 |


## Database Access

All `create`/`update`/`delete` statements are first executed only in memory. Every 10 seconds all collected `create`/`update`/`delete` statements are batched to the database. This is done by a Block `commit`. In summary: The database gets __synchronized__ with the in-memory data every 10 seconds.

## Model

Models are divided into `memory` models and `normal` models. 

### Memory Models
Memory models are solely kept in memory and written to to disc on every Block `commit`. They are once loaded on the start of the application to memory and are then never read again as long as the Blockchain is up.

### Normal Models
On the other hand, `normal` models do only keep a limited number of records in memory. So it is not guaranteed that an entity of a `normal` model is in cache. Normal models are not loaded into memory on startup.


## Smart Contract Usage
When working with smart contracts we want to rollback changes when something goes wrong. Therefore we have the `beginContract()`, `commitContract()` and `rollbackContract()`.

```js
try {
  global.app.sdb.beginContract();
  await Transactions.apply(context); // calls contract
  global.app.sdb.commitContract();
} catch (e) {
  global.app.sdb.rollbackContract(); // rollback on error
  throw e;
}
```

## API

> IMPORTANT!  
> **All** API methods that **change** (`create`, `update`, `delete`) Entites should only be used within contracts. On the other hand the API methods that **read directly** from the Database are meant to be mainly used in HTTP endpoints.


### Startup and Configuration
In order to use the `sdb` package one has to first call the `init()` method.
#### init(): Promise<void>

__Returns__: `void`  
__Description__: This operation is mandatory and initializes the `sdb` package. Initialization includes connecting to the Database, loading the last block, setting the latest block height, loads all entities of the memory models, loading the `BlockHistory` of the latest block.



### create\<T\>(T, Object): Promise\<T\>

__Returns__: `Promise<T>` (an Entity with all default values set)  
__Description__: This operation creates an entity where default values are set. At least the keys (primary keys, composite keys, unique keys) need to be set.

```ts
// create an Account
const created = await sdb.create<Account>(Account, {
  address: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
  gny: String(0),
  username: null,
});

console.log(JSON.stringify(created));
{
  "address": "G45U8A2vdp5CHZ3ABAZwojxdBp44p",
  "gny": "0",
  "username": null,
  "isDelegate": 0,
  "isLocked": 0,
  "lockHeight": "0",
  "lockAmount": "0",
  "_version_": 1
}
```

### get\<T\>(T, Object): Promise<T | void>

> Warning: This works only for `memory models`.

__Returns__: When found in cache then it returns the entity otherwise it returns `undefined`.  
__Description__: This operation solely looks into the cache. It works with PrimaryKeys, UniqueKeys and Composite Keys. If not the whole composite key is provided it throws.

```ts
const resultPrimaryKey = await global.sdb.get<Delegate>(Delegate, {
  address: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
});

const resultUniqueKey = await global.sdb.get<Delegate>(Delegate, {
  tid: '1828313037dabeb911604a2b740821e2037f28e32cfc0794ad7cdb96ef2361e1'
});

const compositeKeyResult = await global.sdb.get<Balance>(Balance, {
  address: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
  currency: 'ABC.ABC',
});
```

### getAll\<T\>(T): Promise<T[]>

> Warning: This works only for `memory models`.

__Returns__: When found in cache then it returns the entities otherwise it returns an empty array.  
__Description__: This operation solely looks into the cache. It returns all entities of a given memory model.

```ts
const allDelegates: Delegate[] = await global.sdb.getAll<Delegate>(Delegate);
```



### load\<T\>(T, Object): Promise<T | void>

__Returns__: When found it returns the searched object. When not found then it returns `undefined`.  
__Description__: This operation tries to load the entity from cache and returns entity if found in cache. If the entity was not found cache - then it hits the DB and returns the entity from the db. When the entity is not in the db - then it returns `undefined`. This operation supports PrimaryKeys, CompositeKeys and UniqueKeys.

```ts
// load by primary key
const resultPrimaryKey = await global.sdb.load<Account>(Account, {
  account: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
});

// load by unique key
const resultUniqueKey = await global.sdb.load<Account>(Account, {
  username: 'xpgeng',
});

// load composite key
const compositeKey = await global.sdb.load<Vote>(Vote, {
  voterAddress: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
  delegate: 'liangpeili',
});
```

### createOrLoad\<T\>(T, Object)

__Returns__: `Promise<{ create: boolean; entity: T }>` (if property `create` is true then a new Object was created; if property `create` is false then the entity was loaded by its primary key. Either way the property `entity` is always set)  
__Description__: As the name suggest this method is composed of `create` and `load`. If the entity can not be loaded from cache or db then it is created.

```ts
// create
const { create, entity } = await sdb.createOrLoad<Round>(Round, {
  round: String(1),
  fee: String(0),
  reward: String(0),
});
console.log(create); // true
console.log(JSON.stringify(entity));
{
  "round": "1",
  "reward": "0",
  "fee": "0"
}

// load
const { create, entity } = await sdb.createOrLoad<Round>(Round, {
  round: String(2),
});
console.log(create); // false
console.log(JSON.stringify(entity));
{
  "round": "3001",
  "reward": "200000000",
  "fee": "0"
}
```

### del\<T\>(T, ObjectWithPrimaryKey(s)): Promise<void>

__Returns__: `Promise<undefined>`  
__Description__: This operation deletes an Entity by its primary key, composite keys or unique key.

```ts
await sdb.del<Vote>(Vote, {
  voterAddress: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
  delegate: 'a1300',
})
```

### update\<T\>(T, ObjectWithUpdatedProps, ObjectWithPrimaryKey(s)): Promise<void>

__Returns__: `Promise<undefined>`  
__Description__: Checks if the property which should be updated is in memory, if not it loads it in memory. In the example below the Account `G4C9q...` gets the new `gny` balance of `'20000000000'`. This operation increments the `_version_` property of each Entity by one.

```ts
await sdb.update<Account>(
  Account,
  { gny: String(20000000000) },
  { address: 'G4C9qLAE4TiuNhjg2RXZYVsMtPdK4' }
);
```

### lock(uniqueLock): void

__Returns__: undefined  
__Description__: Should be only used within smart contract calls. This operation makes a duplicate call to a smart contract within a block impossible. It throws if the same unique identifier is called twice.

```ts
function smartContract() {
  const account: string = this.senderId.address;
  global.sdb.lock(`basic.myContract@${account}`);

  // ... code omitted
}

smartContract(); // works
smartContract(); // throws within same block
```

### increase\<T\>(T, ObjectWithPropertiesToIncrease, ObjectWithPrimaryKey(s)): Promise<Partial\<T\>>

__Returns__: `Promise<Partial<T>>`  
__Description__: Increases the provided properties by a specific Number. This is supported for `Numbers` and `Strings` Numbers (e.g. `'100000000'`). This operation returns only the updated properties of the Entity.

```ts
const account: Account = {
  address: 'G2Ujin7eS9M857JxpnLVUpr6h6RmU',
  gny: String(200000000000),
};

const result = await global.app.sdb.increase<Account>(
  Account,
  { gny: String(200000000000) },
  { address: 'G2Ujin7eS9M857JxpnLVUpr6h6RmU' }
);

console.log(JSON.stringify(result));
{
  "gny": "400000000000"
}
```

### findOne\<T\>(T, FindOneOptions): Promise\<T | void\>

> Warning 1: This operation directly accesses the database without looking into the cache.  
> Warning 2: When the database query returns more than one result an Exception is thrown.

__Returns__: `Promise<T | void>`  
__Description__: This operation queries directly the database.

```ts
// findOneOptions:
interface FindOneOptions<T> {
  condition: Partial<T>;
}

const result = await global.app.findOne<Asset>(Asset, {
  condition: {
    name: 'ACC.ACC',
  },
});
```

### findAll\<T\>(T, FindAllOptions): Promise\<T[]\>

> Warning: This operation directly accesses the database without looking into the cache.

__Returns__: `Promise<T[]>`  
__Description__: This operation accesses directly the database. It supports `pagination` (limit, offset) and `$in` (WHERE IN) operations (see example):

```ts
// search by single property (e.g get all blocks forged by a delegate)
const resultSingle = await global.app.sdb.findAll<Block>(Block, {
  condition: {
    delegate: '47affc7358eef12bd40b92de868769cc1a7dc2a765835989bd9554615cb00e31',
  },
});

// search by WHERE IN
const resultWhereIn = await global.app.sdb.findAll<Delegate>(Delegate, {
  condition: {
    username: {
      $in: ['gny_d29', 'gny_d99'],
    }
  },
});

// sort result (all Delegates order by producedBlocks descending)
const resultSort = await global.app.sdb.findAll<Delegate>(Delegate, {
  condition: {},
  sort: {
    producedBlocks: -1, // -1 descending, 1 ascending
  }
};

// limit and offset (all Delegates in descending order, take only 10)
const resultLimtOffset = await global.app.sdb.findAll<Delegate>(Delegate, {
  condition: {},
  sort: {
    producedBlocks: -1,
  },
  limit: 10,
  offfset: 0,
})

// search for a range of values
const result = await global.app.sdb.findAll<Transaction>(Transaction, {
  condition: {
    height: {
      $gte: minHeight,
      $lte: maxHeight,
    },
  },
});
```

### exists\<T\>(T, Object | ArrayObject):  Promise\<boolean\>

> Warning 1: This operation directly accesses the database  
> Warning 2: This does not work for composite keys, only for UniqueKeys and PrimaryKeys 

__Returns__: `Promise<boolean>`  
__Description__: With this operation you can check if a given item exists already in the database. You can also check if any of the provided items (in an `Array`) are in the database present.

```ts
// check if account name is already in database (e.g. before r)
const existsSingleProp = await global.app.sdb.exists<Account>(Account, {
  username: 'liangpeili',
});

// check if any of any of the transactionIds are in the database
const existsAnyOfArray = await global.app.sdb.exists<Transaction>(Transaction, {
  id: [
    '740aebcd6d10760cdc84f8a7f3636bf3c47dc6f6fe354b4fa485beeb21dfb9e1',
    'f879ee1adccb5baad556f8f4d5e2782ff75fe766024ce4917e7998ab8e28b785',
    '353fa1fec05d0f09fbe9329c1359c4af59ca98b5955201dae00c8858e209e12c',
  ],
});

// this will throw an Exception (because it uses more than 1 property)
await global.app.sdb.exists<Vote>(Vote, {
  voterAddress: 'G4C9qLAE4TiuNhjg2RXZYVsMtPdK4',
  delegate: 'gny_d93',
});
```

### count\<T\>(T, Object): Promise\<number\>

Warning: This operation directly accesses the database.

__Returns__: `Number`  
__Description__: This operation counts how many items are in the database. This operation supports the `$in` (WHERE IN) operator and the range of values (`$gte`, `$lte`) operators.

```ts

// count all Transactions
const result = await global.app.sdb.count<Transaction>(Transaction, {});

// count all Transaction that were generated by delegate x
const resultOne = await global.app.sdb.count<Transaction>(Transaction, {
  delegate: '71ac46cad34569d8948eda6aff2e9f5de5734fef9c22449ed61387034f6efd6d',
});

// count all Transactions between block 1 and 10 (a range)
const resultRange = await global.app.sdb.count<Transaction>(Transaction, {
  height: {
    $gte: String(1),
    $lte: String(10),
  },
});

// count all Transactions for Block 1, 33, 74
count resultWhereIn = await global.app.sdb.count<Transaction>(Transaction, {
  height: {
    $in: [String(1), String(33), String(74)],
  },
});
```

### Query Blocks

#### getBlockByHeight(height, withTransactions = false): Promise\<Block | void\>

__Returns__: `Promise<Block | void>`  
__Description__: If the Block was found in Cache or in the DB the Block gets returned. Otherwise `undefined` is returned. If wanted, the Block can be returned with transactions.

```ts
const block = await global.app.sdb.getBlockByHeight(String(4215));

const blockWithTransactions = await global.app.sdb.getBlockByHeight(String(242), true);
```


#### getBlockById(id, withTransactions = false): Promise\<Block | void\>

__Returns__: `Promise<Block | void>`  
__Description__: If the Block was found in Cache or in the DB the Block gets returned. Otherwise `undefined` is returned. If wanted, the Block can be returned with transactions.

```ts
const block = await global.app.sdb.getBlockById(
  '2086c3e1b04186bd6a3da2335dca1c93806db00060532a17be3d2506935df918'
);

const blockWithTransactions = await global.app.sdb.getBlockById(
  'fa410914aa466ee1a0e4057075dff60f6c0e596e8bff7fe9ad3a64abac4b5b92',
  true
);
```

#### getBlocksByHeightRange(min, max, withTransactions = false): Promise\<Block[]\>

> Warning: Directly hits the database.

__Returns__: `Promise<Block[]>`  
__Description__: This operation directly accesses the database. If wanted, the Block can be returned with transactions. Throws if max height is bigger than min height.


```ts
const block = await global.app.sdb.getBlocksByHeightRange(
  String(50),
  String(100)
);

const blockWithTransactions = await global.app.sdb.getBlocksByHeightRange(
  String(100),
  String(200),
  true
);
```

### Simple Properties

#### lastBlockHeight: string

__Returns__: `string`  
__Description__: This property returns the lastBlockHeight, which is a string.

```ts
const block1 = createBlock(String(1));
global.app.sdb.beginBlock(block1);
await global.app.sdb.commitBlock();

const lastHeight: string = global.app.sdb.lastBlockHeight;
console.log(lastHeight); // "1"
```

#### blocksCount: string

__Returns__: `string`  
__Description__: This property returns the blockCount, which is a string.

```ts
const block5 = createBlock(String(5));
global.app.sdb.beginBlock(block5);
await global.app.sdb.commitBlock();

const blocksCount: string = global.app.sdb.blocksCount;
console.log(blocksCount); // "6"
```

#### lastBlock: Block

__Returns__: `Block`  
__Description__: This property returns the lastBlock.

```ts
const third = createBlock(String(3));
global.app.sdb.beginBlock(third);
await global.app.sdb.commitBlock();

const lastBlock = global.app.sdb.lastBlock;
console.log(JSON.stringify(lastBlock));
{
  "version": 0,
  "delegate": "a71ec9e6eebbd70068a6c3a3c74addd5e51172a6ce96ac40c92203995a205e10",
  "height": "3",
  "prevBlockId": "3e7db3d69080e8d360e3c4277602edd49d0509077914347d50cf3313c5296d7e",
  "timestamp": 24767180,
  "transactions": [],
  "count": 0,
  "fees": "0",
  "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "reward": "0",
  "signature": "526bb84000f2429a2823888e96a9eda59fd9a8a86f00dd8a8bdaebafba801e52d41e55bb7a524e7c1631fb5bbeabd367211c4760706621994e9c8afccc1d7c05",
  "id": "5fa64f2b54fc68da15bfb9b598adb276340b5495971da777ececc90e0034c673"
}
```



### Block related Methods

#### beginBlock(Block): void

__Returns:__ `void`  
__Description:__ This operation prepares the the Block to commit.

#### commitBlock(): Promise\<string\>

__Returns__: LastBlockHeight  
__Description:__ This operation writes all changes made (smart contract calls, updated round info, updated delegate info) to the database.

#### rollbackBlock(height?): Promise\<void\>

__Returns:__ `void`  
__Description__ This operation serves two purposes. First, when called without a height parameter then it rollbacks the current Block in case something went wrong (see the example). Second, it can be used to rollback to a previous Block in case of a Fork in the network.

```ts
// when something goes wrong by applying the block, it makes sure that all operations are reverted to the previous state
try {
  global.app.sdb.beginBlock(block);
  await global.app.sdb.commitBlock();
} catch (e) {
  await global.app.sdb.rollbackBlock();
  throw e;
}


// in case of a fork we can rollback to a previous block
const lastBlock: string = global.app.sdb.lastBlockHeight; // e.g. 1034
global.app.sdb.rollbackBlock(String(1030)); // rollback to 1030
```
