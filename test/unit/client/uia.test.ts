import * as gnyClient from '@gny/client';

import * as matchers from 'jest-extended';
expect.extend(matchers);

describe('uia', () => {
  const uia = gnyClient.uia;

  describe('#registerIssuer', () => {
    let registerIssuer: any;
    let trs: any;

    beforeEach(() => {
      registerIssuer = gnyClient.uia.registerIssuer;
      trs = uia.registerIssuer('xpgeng', 'sdfsf', 'secret', null);
    });

    afterEach(() => {
      trs = null;
    });

    it('should have property setName', () => {
      expect(uia).toHaveProperty('registerIssuer');
    });

    it('should be a function', () => {
      expect(registerIssuer).toBeFunction();
    });

    it('should create registerIssuer transaction', () => {
      expect(trs).toBeObject();
    });

    describe('returned registerIssuer transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and equal 100', () => {
        expect(trs.type).toBeNumber();
        expect(trs.type).toEqual(100);
      });

      describe('fee calculation', () => {
        it('fee for register an issuer is 100 * 1e8', () => {
          const nickname = 'a'.repeat(2);
          trs = registerIssuer(
            nickname,
            'some desc',
            'secret',
            'second secret'
          );
          expect(trs.fee).toBeString();
          expect(trs.fee).toEqual(String(100 * 1e8));
        });
      });
    });
  });

  describe('#registerAsset', () => {
    let trs: any;
    const registerAsset = uia.registerAsset;

    beforeEach(() => {
      trs = registerAsset(
        'aaa',
        'some thing',
        String(10 * 1e8),
        8,
        'secret',
        'second password'
      );
    });

    afterEach(() => {
      trs = null;
    });

    it('should have property registerAsset', () => {
      expect(uia).toHaveProperty('registerAsset');
    });

    it('registerAsset should create transaction', () => {
      trs = registerAsset(
        'aaa',
        'some thing',
        String(10 * 1e8),
        8,
        'secret',
        'second password'
      );
      expect(trs).toBeObject();
    });

    describe('returned registerAsset transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and equal 101', () => {
        expect(trs.type).toBeNumber();
        expect(trs.type).toEqual(101);
      });

      it('should have property fee and be equal to 500 * 1e8', function() {
        expect(trs.fee).toBeString();
        expect(trs.fee).toEqual(String(500 * 1e8));
      });
    });
  });

  describe('#issue', () => {
    let trs: any;
    const issue = uia.issue;

    beforeEach(() => {
      trs = issue('ABC', String(10 * 1e8), 'secret', 'second password');
    });

    afterEach(() => {
      trs = null;
    });

    it('should have property issue', () => {
      expect(uia).toHaveProperty('issue');
    });

    it('issue should create transaction', () => {
      trs = issue('ABC', String(10 * 1e8), 'secret', 'second password');
      expect(trs).toBeObject();
    });

    describe('returned issue transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and equal 102', () => {
        expect(trs.type).toBeNumber();
        expect(trs.type).toEqual(102);
      });

      it('should have property fee and be equal to 0.1 * 1e8', function() {
        expect(trs.fee).toBeString();
        expect(trs.fee).toEqual(String(0.1 * 1e8));
      });
    });
  });

  describe('#transfer', () => {
    let trs: any;
    const transfer = uia.transfer;

    beforeEach(() => {
      trs = transfer(
        'ABC',
        String(10 * 1e8),
        'recipient',
        'some message',
        'secret',
        'second password'
      );
    });

    afterEach(() => {
      trs = null;
    });

    it('should have property transfer', () => {
      expect(uia).toHaveProperty('transfer');
    });

    it('transfer should create transaction', () => {
      trs = transfer(
        'ABC',
        String(10 * 1e8),
        'recipient',
        'some message',
        'secret',
        'second password'
      );
      expect(trs).toBeObject();
    });

    describe('returned transfer transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and equal 101', () => {
        expect(trs.type).toBeNumber();
        expect(trs.type).toEqual(103);
      });

      it('should have property fee and be equal to 0.1 * 1e8', function() {
        expect(trs.fee).toBeString();
        expect(trs.fee).toEqual(String(0.1 * 1e8));
      });
    });
  });
});
