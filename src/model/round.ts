export default {
  table: 'rounds',
  tableFields: [
    { name: 'round', type: 'BigInt', primary_key: true },
    { name: 'fees', type: 'BigInt', not_null: true },
    { name: 'rewards', type: 'BigInt', not_null: true },
  ]
};