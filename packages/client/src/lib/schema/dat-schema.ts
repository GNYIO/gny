import Ajv, { JSONSchemaType } from 'ajv';
const ajv = new Ajv();

interface DATData {
  version: number;
  hash_alg: 'sha256';
  data: string;
  publicKey: string;
  signature: string;
}

// @ts-ignore
export const schema: JSONSchemaType<DATData> = {
  type: 'object',
  properties: {
    version: {
      type: 'integer',
    },
    hash_alg: {
      type: 'string',
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
  },
  required: ['version', 'hash_alg', 'data', 'publicKey', 'signature'],
  additionalProperties: false,
};

const compiled = ajv.compile<DATData>(schema);

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
