export default {
  table: 'accounts',
  tableFields: [
    { name: 'address', type: 'String', length: 50, primary_key: true, not_null: true },
    { name: 'name', type: 'String', length: 20, unique: true },
    { name: 'gny', type: 'BigInt', default: 0 },
    { name: 'publicKey', type: 'String', length: 64 },
    { name: 'secondPublicKey', type: 'String', length: 64 },
    { name: 'isDelegate', type: 'Number', default: 0 },
    { name: 'isLocked', type: 'Number', default: 0 },
    { name: 'lockHeight', type: 'BigInt', default: 0 },
    { name: 'lockNumber', type: 'BigInt', default: 0 },
  ]
};
