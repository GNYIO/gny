const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const standaloneCode = require('ajv/dist/standalone').default;

/**
 * documentation: https://ajv.js.org/standalone.html
 */

// type: JSONSchemaType<DATEither>
const schema = {
  oneOf: [
    {
      title: 'DATEd25519',
      description: 'A DAT that was signed with a private key',
      properties: {
        version: {
          const: 1,
        },
        data: {
          type: 'string',
        },
        publicKey: {
          type: 'string',
        },
        signature: {
          type: 'string',
        },
        cipher: {
          const: 'ed25519',
        },
      },
      required: ['version', 'data', 'publicKey', 'signature', 'cipher'],
      additionalProperties: false,
    },
    {
      title: 'DATsha256',
      description: 'A DAT that was hashed by sha256',
      properties: {
        version: {
          const: 1,
        },
        data: {
          type: 'string',
        },
        hash: {
          type: 'string',
        },
        hash_algo: {
          const: 'sha256',
        },
        additionalProperties: false,
      },
      required: ['version', 'data', 'hash', 'hash_algo'],
      additionalProperties: false,
    },
  ],
};

// The generated code will have a default export:
// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
const ajv = new Ajv({
  code: {
    source: true,
    esm: true,
  },
});

const validate = ajv.compile(schema);
let moduleCode = standaloneCode(ajv, validate);

// Now you can write the module code to file
fs.writeFileSync(path.join(__dirname, './validate-cjs.js'), moduleCode);
