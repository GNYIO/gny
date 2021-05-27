import * as bip39 from 'bip39';
import { isAddress, feeCalculators } from '@gny/utils';
import * as Joi from 'joi';
import { BigNumber } from 'bignumber.js';
import * as CID from 'cids';

const allContractTypes = Object.keys(feeCalculators).map(x => Number(x));

new RegExp(/^$|([a-zA-Z0-9]{1}[a-zA-Z0-9 ]*[a-zA-Z0-9]{1})$/);

interface ExtendedStringSchema extends Joi.StringSchema {
  publicKey(): this;
  secret(): this;
  address(): this;
  username(): this;
  issuer(): this;
  asset(): this;
  signature(): this;
  hex(bufferLength?: any): this;
  ipv4PlusPort(): this;
  positiveOrZeroBigInt(): this;
  networkType(): this;
  multiaddr(): this;
  peerId(): this;
  fee(type: number): this;
}

export interface ExtendedJoi extends Joi.Root {
  string(): ExtendedStringSchema;
  transactionMessage(): this;
}

const transactionMessageExtension: Joi.Extension = {
  base: Joi.string()
    .allow('')
    .max(256)
    .regex(/^$|(^[a-zA-Z0-9]{1}[a-zA-Z0-9 ]*[a-zA-Z0-9]{1}$)|(^[a-zA-Z0-9]$)/)
    .optional(),
  name: 'transactionMessage',
};

const stringExtensions: Joi.Extension = {
  base: Joi.string(),
  name: 'string',
  language: {
    publicKey: 'is not in the format of a 32 char long hex string buffer',
    secret: 'is not BIP39 complient',
    address: 'is not a GNY address',
    username: 'is not an GNY username',
    issuer: 'is not a valid GNY issuer name',
    asset: 'is not a valid GNY asset name',
    signature: 'is not a valid GNY signature',
    hex: 'is not a hex string{{q}}',
    ipv4PlusPort: 'is not a ipv4:port',
    positiveOrZeroBigInt: 'is not a positive or zero big integer amount',
    networkType: 'is not a networkType',
    multiaddr: 'is not a multiaddr',
    peerId: 'is not a peerId',
    fee: 'is not a valid fee',
  },
  rules: [
    {
      name: 'publicKey',
      validate(params, value, state, options) {
        try {
          const x = Buffer.from(value, 'hex');
          if (x.length === 32) return value;
          else
            return this.createError(
              'string.publicKey',
              { v: value },
              state,
              options
            );
        } catch (err) {
          return this.createError(
            'string.publicKey',
            { v: value },
            state,
            options
          );
        }
      },
    },
    {
      name: 'secret',
      validate(params, value, state, options) {
        const result = bip39.validateMnemonic(value);
        if (result === false)
          return this.createError(
            'string.secret',
            { v: value },
            state,
            options
          );
        return value;
      },
    },
    {
      name: 'address',
      validate(params, value, state, options) {
        const result = isAddress(value);
        if (!result) {
          return this.createError(
            'string.address',
            { v: value },
            state,
            options
          );
        }
        return value;
      },
    },
    {
      name: 'username',
      validate(params, value, state, options) {
        const regname = /^[a-z0-9_]{2,20}$/;
        if (!regname.test(value))
          return this.createError(
            'string.username',
            { v: value },
            state,
            options
          );
        return value;
      },
    },
    {
      name: 'issuer',
      validate(params, value, state, options) {
        const regname = /^[A-Za-z]{1,16}$/;
        if (!regname.test(value))
          return this.createError(
            'string.issuer',
            { v: value },
            state,
            options
          );
        return value;
      },
    },
    {
      name: 'asset',
      validate(params, value, state, options) {
        const regname = /^[A-Za-z]{1,16}\.[A-Z]{3,6}$/;
        if (!regname.test(value))
          return this.createError('string.asset', { v: value }, state, options);
        return value;
      },
    },
    {
      name: 'signature',
      validate(params, value, state, options) {
        if (!value)
          return this.createError(
            'string.signature',
            { v: value },
            state,
            options
          );

        try {
          const signature = Buffer.from(value, 'hex');
          if (signature.length === 64) {
            return value;
          }
          return this.createError(
            'string.signature',
            { v: value },
            state,
            options
          );
        } catch (e) {
          return this.createError(
            'string.signature',
            { v: value },
            state,
            options
          );
        }
      },
    },
    {
      name: 'hex',
      params: {
        bufferLength: Joi.number().integer(),
      },
      validate(params, value, state, options) {
        let b;
        try {
          b = Buffer.from(value, 'hex');
        } catch (e) {
          return this.createError(
            'string.hex',
            { v: value, q: '' },
            state,
            options
          );
        }

        if (params.bufferLength && params.bufferLength > 0)
          if (b.length === params.bufferLength) return value;
          else
            return this.createError(
              'string.hex',
              { v: value, q: ` with a buffer length ${params.bufferLength}` },
              state,
              options
            );

        if (b && b.length > 0) {
          return value;
        }

        return this.createError(
          'string.hex',
          { v: value, q: '' },
          state,
          options
        );
      },
    },
    {
      name: 'ipv4PlusPort',
      validate(params, value, state, options) {
        const regname = /^((([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5])\.){3}([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5])|[a-zA-Z0-9]*):(6553[0-5]|655[0-2][0-9]\d|65[0-4](\d){2}|6[0-4](\d){3}|[1-5](\d){4}|[1-9](\d){0,3})$/;
        if (!regname.test(value))
          return this.createError(
            'string.ipv4PlusPort',
            { v: value },
            state,
            options
          );
        return value;
      },
    },
    {
      name: 'positiveOrZeroBigInt',
      validate(params, value, state, options) {
        if (!/^[0-9]*$/.test(value)) {
          return this.createError(
            'string.positiveOrZeroBigInt',
            { v: value },
            state,
            options
          );
        }

        let bnAmount;
        try {
          bnAmount = new BigNumber(value);
        } catch (e) {
          return this.createError(
            'string.positiveOrZeroBigInt',
            { v: value },
            state,
            options
          );
        }
        if (bnAmount.lt(0) || bnAmount.gt('1e48')) {
          return this.createError(
            'string.positiveOrZeroBigInt',
            { v: value },
            state,
            options
          );
        }
        return value;
      },
    },
    {
      name: 'networkType',
      validate(params, value, state, options) {
        if (
          value === 'localnet' ||
          value === 'testnet' ||
          value === 'testnet_app' ||
          value === 'mainnet' ||
          value === 'custom'
        ) {
          return value;
        }

        return this.createError(
          'string.networkType',
          { v: value },
          state,
          options
        );
      },
    },
    {
      name: 'multiaddr',
      validate(params, value, state, options) {
        const test = value.split('/');

        if (test.length !== 7) {
          return this.createError(
            'string.multiaddr',
            { v: value },
            state,
            options
          );
        }

        const ipRegex = /^((([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5])\.){3}([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5])|[a-zA-Z0-9]*)$/;
        const portRegex = /^(6553[0-5]|655[0-2][0-9]\d|65[0-4](\d){2}|6[0-4](\d){3}|[1-5](\d){4}|[1-9](\d){0,3})$/;

        const first = test[0] === '';
        const second = test[1] === 'ip4';
        const third = ipRegex.test(test[2]);
        const fourth = test[3] === 'tcp';
        const fifth = portRegex.test(test[4]);
        const sixth = test[5] === 'p2p';

        let seventh = true;
        try {
          new CID(test[6]);
        } catch (err) {
          seventh = false;
        }

        if (first && second && third && fourth && fifth && sixth && seventh) {
          return value;
        } else {
          return this.createError(
            'string.multiaddr',
            { v: value },
            state,
            options
          );
        }
      },
    },
    {
      name: 'peerId',
      validate(params, value, state, options) {
        let noError = true;
        try {
          new CID(value);
        } catch (err) {
          noError = false;
        }

        if (noError) {
          return value;
        } else {
          return this.createError(
            'string.peerId',
            { v: value },
            state,
            options
          );
        }
      },
    },
    {
      name: 'fee',
      params: {
        type: Joi.number().required(),
      },
      validate(params, value, state, options) {
        if (typeof params.type !== 'number') {
          return this.createError(
            'string.fee',
            { v: value, q: '' },
            state,
            options
          );
        }

        const contract = feeCalculators[params.type];
        if (!contract) {
          return this.createError(
            'string.fee',
            { v: value, q: '' },
            state,
            options
          );
        }

        try {
          if (new BigNumber(contract()).times(1e8).isEqualTo(value)) {
            return value;
          } else {
            return this.createError(
              'string.fee',
              { v: value, q: '' },
              state,
              options
            );
          }
        } catch (err) {
          return this.createError(
            'string.fee',
            { v: value, q: '' },
            state,
            options
          );
        }
      },
    },
  ],
};

export const joi: ExtendedJoi = Joi.extend([
  stringExtensions,
  transactionMessageExtension,
]);
