
# SDB (Database Layer with inbuilt Cache)

## Overview
This package is a database abstraction. In the following we will call this package `sdb`. Sdb helds _most_ of its data in memory and so saves round trips to the database. `Sdb` is intended to be used with smart contracts because it is able to `rollback` changes made by smart contract calls. But more on this later.


# Configuration

TODO


## Life Cycle
Like a blockchain, `sdb` uses a form of Event Sourcing where every change in a data model is represented as a delta (`a -> a'`). That makes it possible to `rollback` to a previous point in time.

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

All create/update/delete statements are executed first executed only in memory. Every 10 seconds all collected create/update/delete statements are batched to the database. This is done by a Block `commit`. In summary: The database gets synchronized with the in-memory data every 10 seconds.

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
> **All** API methods that **change** (create, update, delete) Entites should only be used within contracts. On the other hand the API methods that **read directly** from the Database are meant to be mainly used in HTTP endpoints.


### create<T>(T, Object): Promise<T>

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

### createOrLoad<T>(T, Object)

__Returns__: `Promise<{ create: boolean; entity: T }>` (if property `create` is true then a new Object was created; if property `create` is false then the entity was loaded by its primary key. Either way the property `entity` is always set)
__Description__: As the name suggest the this method is composed of `create` and `load`. If the entity can not be loaded from cache or db then it is created.

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

// not found
```

### del<T>(T, ObjectWithPrimaryKey(s)): Promise<void>

__Returns__: `Promise<undefined>`
__Description__: This operation deletes an Entity by its primary key, composite keys or unique key.

```ts
await sdb.del<Vote>(Vote, {
  voterAddress: 'G45U8A2vdp5CHZ3ABAZwojxdBp44p',
  delegate: 'a1300',
})
```

### update<T>(T, ObjectWithUpdatedProps, ObjectWithPrimaryKey(s)): Promise<void>

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

### increase<T>(T, ObjectWithPropertiesToIncrease, ObjectWithPrimaryKey(s)): Promise<Partial<T>>

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

