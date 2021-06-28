import { joi } from '../../../packages/extended-joi/src/index';

describe('extendedJoi', () => {
  describe('pulickey', () => {
    it('should return a report with null error', () => {
      const publicKey =
        '8c9f363ef4e7fcad161f1cfaceff15b557956593f8dcd989139822f7e2abe6f4';

      const schema = joi
        .string()
        .publicKey()
        .required();

      const report = joi.validate(publicKey, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(publicKey);
    });

    it('should return a report with error', () => {
      const publicKey = '8c9f363ef4e7fcad161f1cfaceff15b557';

      const schema = joi
        .string()
        .publicKey()
        .required();

      const report = joi.validate(publicKey, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('secret', () => {
    it('should return a report with null error', () => {
      const secret =
        'grow pencil ten junk bomb right describe trade rich valid tuna service';

      const schema = joi
        .string()
        .secret()
        .required();

      const report = joi.validate(secret, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(secret);
    });

    it('should return a report with error', () => {
      const secret = 'grow pencil ten junk bomb right describe trade';

      const schema = joi
        .string()
        .secret()
        .required();

      const report = joi.validate(secret, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('address', () => {
    it('should return a report with null error', () => {
      const address = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';

      const schema = joi
        .string()
        .address()
        .required();

      const report = joi.validate(address, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(address);
    });

    it('should return a report with error', () => {
      const address = 'T4GDW6G78sgQdSdVAQUXdm5xPS13t';

      const schema = joi
        .string()
        .address()
        .required();

      const report = joi.validate(address, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('username', () => {
    it('should return a report with null error', () => {
      const username = 'liang_peili';

      const schema = joi
        .string()
        .username()
        .required();

      const report = joi.validate(username, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(username);
    });

    it('should return a report with error if the username is capitalized', () => {
      const username = 'LIANG';

      const schema = joi
        .string()
        .username()
        .required();

      const report = joi.validate(username, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report with error if the usename is too long', () => {
      const username = 'lianggggggggggggggggggggggpeili';

      const schema = joi
        .string()
        .username()
        .required();

      const report = joi.validate(username, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report with error if the usename contains some symbols except `_`', () => {
      const username = 'df#123';

      const schema = joi
        .string()
        .username()
        .required();

      const report = joi.validate(username, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('partialUsername', () => {
    it('should return a report with error when a partialUsername is empty', () => {
      const partialUsername = '';

      // no required, otherwise the required() part triggers an error
      const schema = joi.partialUsername();

      const report = joi.validate(partialUsername, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report with error when a single space', () => {
      const partialUsername = ' ';

      // no required, otherwise the required() part triggers an error
      const schema = joi.partialUsername();

      const report = joi.validate(partialUsername, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report with error when a dollar sign is passed in', () => {
      const partialUsername = '$';

      // no required, otherwise the required() part triggers an error
      const schema = joi.partialUsername();

      const report = joi.validate(partialUsername, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report with null error on a single character', () => {
      const partialUsername = 'f';

      const schema = joi.partialUsername().required();

      const report = joi.validate(partialUsername, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(partialUsername);
    });

    it('should return a report with null for a single underscore', () => {
      const partialUsername = '_';

      const schema = joi.partialUsername().required();

      const report = joi.validate(partialUsername, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(partialUsername);
    });

    it('should return a report with null for a single digit', () => {
      const partialUsername = 1;

      const schema = joi.partialUsername().required();

      const report = joi.validate(partialUsername, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(partialUsername);
    });
  });

  describe('issuer', () => {
    it('should return a report with null error', () => {
      const issuer = 'liangpeili';

      const schema = joi
        .string()
        .issuer()
        .required();

      const report = joi.validate(issuer, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(issuer);
    });

    it('should return a report with error', () => {
      const issuer = 'liang123';

      const schema = joi
        .string()
        .issuer()
        .required();

      const report = joi.validate(issuer, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('asset', () => {
    it('should return a report with null error', () => {
      const asset = 'ABC.BBB';

      const schema = joi
        .string()
        .asset()
        .required();

      const report = joi.validate(asset, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(asset);
    });

    it('should return a report with error', () => {
      const asset = 'BBB';

      const schema = joi
        .string()
        .asset()
        .required();

      const report = joi.validate(asset, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report with error', () => {
      const asset = 'ABCBBB';

      const schema = joi
        .string()
        .asset()
        .required();

      const report = joi.validate(asset, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('signature', () => {
    it('should return a report with null error', () => {
      const signature =
        'cf56b32f7e1206bee719ef0cae141beff253b5b93e55b3f9bf7e71705a0f03b4afd8ad53db9aecb32a9054dee5623ee4e85a16fab2c6c75fc17f0263adaefd0c';

      const schema = joi
        .string()
        .signature()
        .required();

      const report = joi.validate(signature, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(signature);
    });

    it('should return a report with error', () => {
      const signature = 'cf56b32f7e1206bee719ef0ca';

      const schema = joi
        .string()
        .signature()
        .required();

      const report = joi.validate(signature, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('hex', () => {
    it('should return a report with null error', () => {
      const hex =
        '8c9f363ef4e7fcad161f1cfaceff15b557956593f8dcd989139822f7e2abe6f4';

      const schema = joi
        .string()
        .hex(32)
        .required();

      const report = joi.validate(hex, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(hex);
    });

    it('should return a report with error if buffer length is wrong', () => {
      const hex =
        '8c9f363ef4e7fcad161f1cfaceff15b557956593f8dcd989139822f7e2abe6f4';

      const schema = joi
        .string()
        .hex(16)
        .required();

      const report = joi.validate(hex, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('passes test for ordinary hex string (no length parameter)', () => {
      const hex = Buffer.from('123456').toString('hex');

      const schema = joi
        .string()
        .hex()
        .required();

      const report = joi.validate(hex, schema);
      expect(report.error).toBeNull();
    });

    it('reports error when value is not hex string (no length parameter)', () => {
      const NOT_HEX = 'somestring';

      const schema = joi
        .string()
        .hex()
        .required();

      const report = joi.validate(NOT_HEX, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return report when string is not hex (with length parameter)', () => {
      const NOT_HEX = 'nothexstring';

      const schema = joi
        .string()
        .hex(16)
        .required();

      const report = joi.validate(NOT_HEX, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('ipv4PlusPort', () => {
    it('should return a report with null error', () => {
      const ip = '127.0.0.1:8888';

      const schema = joi
        .string()
        .ipv4PlusPort()
        .required();

      const report = joi.validate(ip, schema);
      expect(report.error).toBeNull();
      expect(report.value).toBe(ip);
    });

    it('should return a report with error if the port is not provided', () => {
      const ip = '127.0.0.1';

      const schema = joi
        .string()
        .ipv4PlusPort()
        .required();

      const report = joi.validate(ip, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('positiveOrZeroBigInt', () => {
    it('should return a report when passed in "-1"', () => {
      const VALUE = String(-1);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report when passed in empty string', () => {
      const VALUE = '';

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report when passed in "0.5"', () => {
      const VALUE = String(0.5);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report when passed in a negative integer "-1"', () => {
      const VALUE = String(-1);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report when passed in a negative decimal "-8.4"', () => {
      const VALUE = String(-1);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should return a report when passed in a decimal "3.8"', () => {
      const VALUE = String(4.8);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should pass when passed in a INTEGER "0"', () => {
      const VALUE = String(0);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should pass when passed in a INTEGER "1"', () => {
      const VALUE = String(1);

      const schema = joi
        .string()
        .positiveOrZeroBigInt()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });
  });

  describe('networkType', () => {
    it('should pass when passed in localnet', () => {
      const VALUE = 'localnet';

      const schema = joi
        .string()
        .networkType()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should pass when passed in testnet', () => {
      const VALUE = 'testnet';

      const schema = joi
        .string()
        .networkType()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should pass when passed in mainnet', () => {
      const VALUE = 'mainnet';

      const schema = joi
        .string()
        .networkType()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should return report when passed in "ibsoeprughcm"', () => {
      const VALUE = 'ibsoeprughcm';

      const schema = joi
        .string()
        .networkType()
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('transactionMessage', () => {
    it('should fail with null passed in', () => {
      const VALUE = null;

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should pass with undefined', () => {
      const VALUE = undefined;

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should pass with string with 256 characters', () => {
      const VALUE = 'a'.repeat(256);

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should fail with string of 257 characters', () => {
      const VALUE = 'a'.repeat(257);

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should pass when passed in empty string', () => {
      const VALUE = '';

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should fail with single space character', () => {
      const VALUE = ' ';

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should pass with single word', () => {
      const VALUE = 'hello';

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should pass with sentence', () => {
      const VALUE = 'this is a whole sentence';

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should fail with sentence with leading space', () => {
      const VALUE = ' this sentence has a leading space';

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should fail with setence with space at the end', () => {
      const VALUE = 'sentence with space at the end ';

      const schema = joi.transactionMessage();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('multiaddr', () => {
    it('should pass with valid multiaddr string', () => {
      const VALUE =
        '/ip4/172.20.0.3/tcp/4097/p2p/QmTEfBHjNABsYevH1vXusACzwv9GSBrspc1rqvbkMXv8sN';

      const schema = joi.string().multiaddr();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('should fail for empty string', () => {
      const VALUE = '';

      const schema = joi.string().multiaddr();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should fail with wrong ip', () => {
      const VALUE =
        '/ip6/172.20.0.3/tcp/4097/p2p/QmTEfBHjNABsYevH1vXusACzwv9GSBrspc1rqvbkMXv8sN';

      const schema = joi.string().multiaddr();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should fail with wrong port', () => {
      const VALUE =
        '/ip4/172.20.0.3/tcp/100000/p2p/QmTEfBHjNABsYevH1vXusACzwv9GSBrspc1rqvbkMXv8sN';

      const schema = joi.string().multiaddr();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('should fail with wrong B58 Id', () => {
      const VALUE =
        '/ip4/172.20.0.3/tcp/4097/p2p/QmTEfZZZZZZZZZZZZZZBsYevH1vXusACzwv9GSBrspc1rqvbkMXv8sN';

      const schema = joi.string().multiaddr();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });
  });

  describe('peerId', () => {
    it('random string is not valid', () => {
      const VALUE = 'some random string';

      const schema = joi.string().peerId();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('random hex string is not valid', () => {
      const VALUE = Buffer.from('hello hello').toString('hex');

      const schema = joi.string().peerId();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('valid peerId succeeds', () => {
      const VALUE = 'Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';

      const schema = joi.string().peerId();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });
  });

  describe('fee', () => {
    it('fee - succeeds if ', () => {
      const VALUE = {
        type: 0,
        fee: String(0.1 * 1e8),
      };

      const schema = joi
        .object()
        .keys({
          type: joi.number().required(),
          fee: joi
            .string()
            .fee(VALUE.type)
            .required(),
        })
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error).toBeNull();
    });

    it('fee - fails if fee for "basic.transfer" (type 0) is higher', () => {
      const VALUE = {
        type: 0,
        fee: String(0.2 * 1e8), // wrong
      };

      const schema = joi
        .object()
        .keys({
          type: joi.number().required(),
          fee: joi
            .string()
            .fee(VALUE.type)
            .required(),
        })
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('fee - fails if fee for "basic.transfer" (type 0) is lower', () => {
      const VALUE = {
        type: 0,
        fee: String(0 * 1e8), // wrong
      };

      const schema = joi
        .object()
        .keys({
          type: joi.number().required(),
          fee: joi
            .string()
            .fee(VALUE.type)
            .required(),
        })
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('fee - fails if fee parameter -1 is passed in', () => {
      const VALUE = {
        fee: String(0.1 * 1e8),
      };

      const schema = joi
        .object()
        .keys({
          type: joi.number(),
          fee: joi
            .string()
            .fee(-1)
            .required(),
        })
        .required();

      const report = joi.validate(VALUE, schema);
      expect(report.error.name).toBe('ValidationError');
    });

    it('fee - schema compilation fails if "undefined" is fee parameter is passed in', () => {
      const VALUE = {};
      return expect(() => {
        const schema = joi
          .object()
          .keys({
            type: joi.number(),
            fee: joi
              .string()
              .fee(undefined)
              .required(),
          })
          .required();
      }).toThrowError();
    });
  });
});
