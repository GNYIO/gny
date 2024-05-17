/* tslint:disable */
// tslint does not like the auto-generated functions from "ajv"

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

export type DATEither = DATed25519 | DATsha256;

// @ts-ignore

/**
 * WARNING: this does not check if the signature (public/private key cryptography) or hash matches, it only checks if the structure of the data is correct
 * @param input provide JSON value
 * @returns
 */
export function validate(input: any) {
  if (validate10(input)) {
    return {
      result: true,
    };
  } else {
    return {
      result: false,
      // @ts-ignore
      errors: validate10.errors,
    };
  }
}

/**
 *  Everything below has been auto-generated with file
 *  scripts/generate-json-schema.js
 *  You can auto-generate your schema if you simply paste your
 *  JSON schema into the file mentioned above
 */
export const schema = {
  oneOf: [
    {
      title: 'DATEd25519',
      description: 'A DAT that was signed with a private key',
      properties: {
        version: { const: 1 },
        data: { type: 'string' },
        publicKey: { type: 'string' },
        signature: { type: 'string' },
        cipher: { const: 'ed25519' },
      },
      required: ['version', 'data', 'publicKey', 'signature', 'cipher'],
      additionalProperties: false,
    },
    {
      title: 'DATsha256',
      description: 'A DAT that was hashed by sha256',
      properties: {
        version: { const: 1 },
        data: { type: 'string' },
        hash: { type: 'string' },
        hash_algo: { const: 'sha256' },
        additionalProperties: false,
      },
      required: ['version', 'data', 'hash', 'hash_algo'],
      additionalProperties: false,
    },
  ],
};
function validate10(
  data,
  // @ts-ignore
  { instancePath = '', parentData, parentDataProperty, rootData = data } = {}
) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  let passing0 = null;
  const _errs1 = errors;
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    let missing0;
    if (
      (data.version === undefined && (missing0 = 'version')) ||
      (data.data === undefined && (missing0 = 'data')) ||
      (data.publicKey === undefined && (missing0 = 'publicKey')) ||
      (data.signature === undefined && (missing0 = 'signature')) ||
      (data.cipher === undefined && (missing0 = 'cipher'))
    ) {
      const err0 = {
        instancePath,
        schemaPath: '#/oneOf/0/required',
        keyword: 'required',
        params: { missingProperty: missing0 },
        message: "must have required property '" + missing0 + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    } else {
      const _errs2 = errors;
      for (const key0 in data) {
        if (
          !(
            key0 === 'version' ||
            key0 === 'data' ||
            key0 === 'publicKey' ||
            key0 === 'signature' ||
            key0 === 'cipher'
          )
        ) {
          const err1 = {
            instancePath,
            schemaPath: '#/oneOf/0/additionalProperties',
            keyword: 'additionalProperties',
            params: { additionalProperty: key0 },
            message: 'must NOT have additional properties',
          };
          if (vErrors === null) {
            vErrors = [err1];
          } else {
            vErrors.push(err1);
          }
          errors++;
          break;
        }
      }
      if (_errs2 === errors) {
        if (data.version !== undefined) {
          const _errs3 = errors;
          if (1 !== data.version) {
            const err2 = {
              instancePath: instancePath + '/version',
              schemaPath: '#/oneOf/0/properties/version/const',
              keyword: 'const',
              params: { allowedValue: 1 },
              message: 'must be equal to constant',
            };
            if (vErrors === null) {
              vErrors = [err2];
            } else {
              vErrors.push(err2);
            }
            errors++;
          }
          var valid1 = _errs3 === errors;
        } else {
          var valid1 = true;
        }
        if (valid1) {
          if (data.data !== undefined) {
            const _errs4 = errors;
            if (typeof data.data !== 'string') {
              const err3 = {
                instancePath: instancePath + '/data',
                schemaPath: '#/oneOf/0/properties/data/type',
                keyword: 'type',
                params: { type: 'string' },
                message: 'must be string',
              };
              if (vErrors === null) {
                vErrors = [err3];
              } else {
                vErrors.push(err3);
              }
              errors++;
            }
            var valid1 = _errs4 === errors;
          } else {
            var valid1 = true;
          }
          if (valid1) {
            if (data.publicKey !== undefined) {
              const _errs6 = errors;
              if (typeof data.publicKey !== 'string') {
                const err4 = {
                  instancePath: instancePath + '/publicKey',
                  schemaPath: '#/oneOf/0/properties/publicKey/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                };
                if (vErrors === null) {
                  vErrors = [err4];
                } else {
                  vErrors.push(err4);
                }
                errors++;
              }
              var valid1 = _errs6 === errors;
            } else {
              var valid1 = true;
            }
            if (valid1) {
              if (data.signature !== undefined) {
                const _errs8 = errors;
                if (typeof data.signature !== 'string') {
                  const err5 = {
                    instancePath: instancePath + '/signature',
                    schemaPath: '#/oneOf/0/properties/signature/type',
                    keyword: 'type',
                    params: { type: 'string' },
                    message: 'must be string',
                  };
                  if (vErrors === null) {
                    vErrors = [err5];
                  } else {
                    vErrors.push(err5);
                  }
                  errors++;
                }
                var valid1 = _errs8 === errors;
              } else {
                var valid1 = true;
              }
              if (valid1) {
                if (data.cipher !== undefined) {
                  const _errs10 = errors;
                  if ('ed25519' !== data.cipher) {
                    const err6 = {
                      instancePath: instancePath + '/cipher',
                      schemaPath: '#/oneOf/0/properties/cipher/const',
                      keyword: 'const',
                      params: { allowedValue: 'ed25519' },
                      message: 'must be equal to constant',
                    };
                    if (vErrors === null) {
                      vErrors = [err6];
                    } else {
                      vErrors.push(err6);
                    }
                    errors++;
                  }
                  var valid1 = _errs10 === errors;
                } else {
                  var valid1 = true;
                }
              }
            }
          }
        }
      }
    }
  }
  var _valid0 = _errs1 === errors;
  if (_valid0) {
    valid0 = true;
    passing0 = 0;
  }
  const _errs11 = errors;
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    let missing1;
    if (
      (data.version === undefined && (missing1 = 'version')) ||
      (data.data === undefined && (missing1 = 'data')) ||
      (data.hash === undefined && (missing1 = 'hash')) ||
      (data.hash_algo === undefined && (missing1 = 'hash_algo'))
    ) {
      const err7 = {
        instancePath,
        schemaPath: '#/oneOf/1/required',
        keyword: 'required',
        params: { missingProperty: missing1 },
        message: "must have required property '" + missing1 + "'",
      };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    } else {
      const _errs12 = errors;
      for (const key1 in data) {
        if (
          !(
            key1 === 'version' ||
            key1 === 'data' ||
            key1 === 'hash' ||
            key1 === 'hash_algo' ||
            key1 === 'additionalProperties'
          )
        ) {
          const err8 = {
            instancePath,
            schemaPath: '#/oneOf/1/additionalProperties',
            keyword: 'additionalProperties',
            params: { additionalProperty: key1 },
            message: 'must NOT have additional properties',
          };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
          break;
        }
      }
      if (_errs12 === errors) {
        if (data.version !== undefined) {
          const _errs13 = errors;
          if (1 !== data.version) {
            const err9 = {
              instancePath: instancePath + '/version',
              schemaPath: '#/oneOf/1/properties/version/const',
              keyword: 'const',
              params: { allowedValue: 1 },
              message: 'must be equal to constant',
            };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
          var valid2 = _errs13 === errors;
        } else {
          var valid2 = true;
        }
        if (valid2) {
          if (data.data !== undefined) {
            const _errs14 = errors;
            if (typeof data.data !== 'string') {
              const err10 = {
                instancePath: instancePath + '/data',
                schemaPath: '#/oneOf/1/properties/data/type',
                keyword: 'type',
                params: { type: 'string' },
                message: 'must be string',
              };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
            var valid2 = _errs14 === errors;
          } else {
            var valid2 = true;
          }
          if (valid2) {
            if (data.hash !== undefined) {
              const _errs16 = errors;
              if (typeof data.hash !== 'string') {
                const err11 = {
                  instancePath: instancePath + '/hash',
                  schemaPath: '#/oneOf/1/properties/hash/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                };
                if (vErrors === null) {
                  vErrors = [err11];
                } else {
                  vErrors.push(err11);
                }
                errors++;
              }
              var valid2 = _errs16 === errors;
            } else {
              var valid2 = true;
            }
            if (valid2) {
              if (data.hash_algo !== undefined) {
                const _errs18 = errors;
                if ('sha256' !== data.hash_algo) {
                  const err12 = {
                    instancePath: instancePath + '/hash_algo',
                    schemaPath: '#/oneOf/1/properties/hash_algo/const',
                    keyword: 'const',
                    params: { allowedValue: 'sha256' },
                    message: 'must be equal to constant',
                  };
                  if (vErrors === null) {
                    vErrors = [err12];
                  } else {
                    vErrors.push(err12);
                  }
                  errors++;
                }
                var valid2 = _errs18 === errors;
              } else {
                var valid2 = true;
              }
              if (valid2) {
                if (data.additionalProperties !== undefined) {
                  var valid2 = false;
                  const err13 = {
                    instancePath: instancePath + '/additionalProperties',
                    schemaPath:
                      '#/oneOf/1/properties/additionalProperties/false schema',
                    keyword: 'false schema',
                    params: {},
                    message: 'boolean schema is false',
                  };
                  if (vErrors === null) {
                    vErrors = [err13];
                  } else {
                    vErrors.push(err13);
                  }
                  errors++;
                } else {
                  var valid2 = true;
                }
              }
            }
          }
        }
      }
    }
  }
  var _valid0 = _errs11 === errors;
  if (_valid0 && valid0) {
    valid0 = false;
    passing0 = [passing0, 1];
  } else {
    if (_valid0) {
      valid0 = true;
      passing0 = 1;
    }
  }
  if (!valid0) {
    const err14 = {
      instancePath,
      schemaPath: '#/oneOf',
      keyword: 'oneOf',
      params: { passingSchemas: passing0 },
      message: 'must match exactly one schema in oneOf',
    };
    if (vErrors === null) {
      vErrors = [err14];
    } else {
      vErrors.push(err14);
    }
    errors++;
    // @ts-ignore
    validate10.errors = vErrors;
    return false;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  // @ts-ignore
  validate10.errors = vErrors;
  return errors === 0;
}
