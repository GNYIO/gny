export default {
  table: 'blocks',
  tableFields: [
    { name: 'id', type: 'String', length: 64, not_null: true, primary_key: true },
    { name: 'timestamp', type: 'Number', not_null: true },
    { name: 'height', type: 'BigInt', not_null: true },
    { name: 'prevBlockId', type: 'String', length: 64, not_null: true, index: true },
    { name: 'numberOfTransactions', type: 'Number', not_null: true },
    { name: 'totalAmount', type: 'BigInt', not_null: true },
    { name: 'totalFee', type: 'BigInt', not_null: true },
    { name: 'reward', type: 'BigInt', not_null: true },
    { name: 'payloadLength', type: 'Number', not_null: true },
    { name: 'payloadHash', type: 'String', length: 32, not_null: true },
    { name: 'generatorPublicKey', type: 'String', length: 32, not_null: true},
    { name: 'signature', type: 'String', length: 64, not_null: true }
  ]
};
