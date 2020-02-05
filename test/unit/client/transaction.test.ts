import 'jest-extended';
import * as gnyClient from '@gny/client';
import { joi } from '@gny/extended-joi';
import { ITransaction } from '@gny/interfaces';

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transaction', () => {
  const transaction = gnyClient.transaction;

  it('should be object', () => {
    expect(transaction).toBeObject();
  });

  it('should have properties', () => {
    expect(transaction).toHaveProperty('createTransactionEx');
  });

  describe('#createTransaction', () => {
    const createTransaction = transaction.createTransactionEx;
    let trs: ITransaction;

    beforeEach(() => {
      trs = createTransaction({
        type: 1,
        fee: String(1 * 1e8),
        message: '',
        secret: genesisSecret,
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
      });
    });

    afterEach(() => {
      trs = null;
    });

    it('should be a function', () => {
      expect(createTransaction).toBeFunction();
    });

    it('should create transaction without second signature', () => {
      trs = createTransaction({
        type: 1,
        fee: String(1 * 1e8),
        message: '',
        secret: genesisSecret,
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
      });

      expect(trs).toHaveProperty('id');
    });

    describe('returned transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and eqaul 1', () => {
        expect(trs.type).toEqual(1);
      });

      it('should have timestamp as number', () => {
        expect(trs.timestamp).toBeNumber();
      });

      it('should have senderPublicKey as hex string', () => {
        const publicSchema = joi
          .string()
          .hex(32)
          .required();

        const publicReport = joi.validate(trs.senderPublicKey, publicSchema);
        expect(publicReport.error).toBeNull();
      });

      it('should have args array and amount of 200000000000 at first position', () => {
        expect(trs.args[0]).toEqual(200000000000);
      });

      it('should have args array and recipient G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv at second position', () => {
        expect(trs.args[1]).toEqual('G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv');
      });

      it('should does not have second signature', () => {
        expect(trs).not.toHaveProperty('secondSignature');
      });

      it('should have signature as hex string', () => {
        const schema = joi
          .string()
          .hex(64)
          .required();

        const report = joi.validate(trs.signatures[0], schema);
        expect(report.error).toBeNull();
      });

      it('should be signed correctly', () => {
        const result = gnyClient.crypto.verify(trs);
        expect(result).toBeTrue();
      });

      it('should not be signed correctly now', () => {
        trs.args[0] = 10000;
        const result = gnyClient.crypto.verify(trs);
        expect(result).toBeFalse();
      });
    });
  });

  describe('#createTransaction with second secret', () => {
    const createTransaction = transaction.createTransactionEx;
    let trs: ITransaction;
    const secondSecret =
      'carpet pudding topple genuine relax rally problem before pill gun nation method';
    const keys = gnyClient.crypto.getKeys(secondSecret);

    beforeEach(() => {
      trs = createTransaction({
        type: 1,
        fee: String(1 * 1e8),
        message: '',
        secret: genesisSecret,
        secondSecret:
          'carpet pudding topple genuine relax rally problem before pill gun nation method',
        args: [200000000000, 'G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv'],
      });
    });

    afterEach(() => {
      trs = null;
    });

    it('should be a function', () => {
      expect(createTransaction).toBeFunction();
    });

    describe('returned transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and eqaul 1', () => {
        expect(trs.type).toEqual(1);
      });

      it('should have timestamp as number', () => {
        expect(trs.timestamp).toBeNumber();
      });

      it('should have senderPublicKey as hex string', () => {
        const publicSchema = joi
          .string()
          .hex(32)
          .required();

        const publicReport = joi.validate(trs.senderPublicKey, publicSchema);
        expect(publicReport.error).toBeNull();
      });

      it('should have args array and amount of 200000000000 at first position', () => {
        expect(trs.args[0]).toEqual(200000000000);
      });

      it('should have args array and recipient G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv at second position', () => {
        expect(trs.args[1]).toEqual('G3FkpyJr5gZmd1gPCZ6pQGAM5DPSv');
      });

      it('should have second signature', () => {
        expect(trs).toHaveProperty('secondSignature');
      });

      it('should have signature as hex string', () => {
        const schema = joi
          .string()
          .hex(64)
          .required();

        const report = joi.validate(trs.signatures[0], schema);
        expect(report.error).toBeNull();
      });

      it('should have secondSignature as hex string', () => {
        const schema = joi
          .string()
          .hex(64)
          .required();

        const report = joi.validate(trs.secondSignature, schema);
        expect(report.error).toBeNull();
      });

      it('should be signed correctly', () => {
        const result = gnyClient.crypto.verify(trs);
        expect(result).toBeTrue();
      });

      it('should be second signed correctly', () => {
        const result = gnyClient.crypto.verifySecondSignature(
          trs,
          keys.publicKey
        );
        expect(result).toBeTrue();
      });

      it('should not be signed correctly now', () => {
        trs.args[0] = 10000;
        const result = gnyClient.crypto.verify(trs);
        expect(result).toBeFalse();
      });

      it('should not be second signed correctly now', () => {
        trs.args[0] = 10000;
        const result = gnyClient.crypto.verifySecondSignature(
          trs,
          keys.publicKey
        );
        expect(result).toBeFalse();
      });
    });
  });
});
