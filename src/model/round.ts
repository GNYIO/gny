export default {
  table: 'rounds',
  tableFields: [
    { name: 'round', type: 'BigInt', primary_key: true },
    { name: 'fee', type: 'BigInt', not_null: true },
    { name: 'reward', type: 'BigInt', not_null: true },
  ]
};