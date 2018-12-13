export default {
  table: 'issuers',
  tableFields: [
    { name: 'transactionId', type: 'String', length: 64, unique: true },
    { name: 'username', type: 'String', length: 32, primary_key: true },
    { name: 'issuerId', type: 'String', length: 50, unique: true },
    { name: 'description', type: 'Text' }
  ]
};
