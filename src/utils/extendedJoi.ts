import * as Mnemonic from 'bitcore-mnemonic';
import * as Joi from 'joi';

interface ExtendedStringSchema extends Joi.StringSchema {
  publicKey(): this;
  secret(): this;
}

export interface ExtendedJoi extends Joi.Root {
  string(): ExtendedStringSchema;
}

const stringExtensions: Joi.Extension = {
  base: Joi.string(),
  name: 'string',
  language: {
    publicKey: 'is not in the format of a 32 char long hex string buffer',
    secret: 'is not BIP39 complient',
  },
  rules: [{
    name: 'publicKey',
    validate(params, value, state, options) {
      try {
        const x = Buffer.from(value, 'hex');
        if (x.length === 32)
          return value;
        else
          return this.createError('string.publicKey', { v: value }, state, options);
      } catch (err) {
        return this.createError('string.publicKey', { v: value }, state, options);
      }
    }
  },
  {
    name: 'secret',
    validate(params, value, state, options) {
      const result = Mnemonic.isValid(value);
      if (result === false) return this.createError('string.secret', { v: value }, state, options);
      return value;
    }
  }]
};

const newJoi: ExtendedJoi = Joi.extend(stringExtensions);

export default newJoi;
