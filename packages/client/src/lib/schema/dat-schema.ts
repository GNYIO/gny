import Ajv, { JSONSchemaType } from 'ajv';
const ajv = new Ajv({
  logger: {
    log: function log() {},
    warn: function warn() {},
    error: function error() {},
  },
});

export interface DATed25519 {
  version: 1;
  data: string;
  publicKey: string;
  signature: string;
  cipher: 'ed25519';
}

export interface DATsha256 {
  version: 1;
  data: string;
  hash: string;
  hash_algo: 'sha256';
}

type DATEither = DATed25519 | DATsha256;

// @ts-ignore
export const schema: JSONSchemaType<DATEither> = {
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

const compiled = ajv.compile<DATEither>(schema);

/**
 * WARNING: this does not check if the signature (public/private key cryptography) or hash matches, it only checks if the structure of the data is correct
 * @param input provide JSON value
 * @returns
 */
export function validate(input: any) {
  if (compiled(input)) {
    return {
      result: true,
    };
  } else {
    return {
      result: false,
      errors: compiled.errors,
    };
  }
}
