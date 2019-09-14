import * as gnyClient from '../index';
import extendedJoi from '../../../src/utils/extendedJoi';
import 'jest-extended';

describe('basic', () => {
  const basic = gnyClient.basic;

  describe('#setUserName', () => {
    let setName;
    let trs;

    beforeEach(() => {
      setName = gnyClient.basic.setUserName;
      trs = basic.setUserName('sqfasd', 'secret', null);
    });

    afterEach(() => {
      trs = null;
    });

    it('should have property setName', () => {
      expect(basic).toHaveProperty('setUserName');
    });

    it('should be a function', () => {
      expect(setName).toBeFunction();
    });

    it('should create setName transaction', () => {
      expect(trs).toBeObject();
    });

    describe('returned setName transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and equal 2', () => {
        expect(trs.type).toBeNumber();
        expect(trs.type).toEqual(1);
      });

      describe('fee calculation', () => {
        it('fee for nickname is 5 * 1e8', () => {
          const nickname = 'a'.repeat(2);
          trs = setName(nickname, 'secret', 'second secret');
          expect(trs.fee).toBeString();
          expect(trs.fee).toEqual(String(5 * 1e8));
        });
      });
    });
  });

  describe('#setSecondSecret', () => {
    let trs;
    const setSecondSecret = basic.setSecondPassphrase;

    beforeEach(() => {
      trs = setSecondSecret('secret', 'second password');
    });

    afterEach(() => {
      trs = null;
    });

    it('should have property setSecondSecret', () => {
      // basic.should.have.property('setSecondSecret');
      expect(basic).toHaveProperty('setSecondPassphrase');
    });

    it('setSecondSecret should create transaction', () => {
      trs = setSecondSecret('secret', 'second secret');
      expect(trs).toBeObject();
    });

    describe('returned setSecondSecret transaction', () => {
      it('should have id as string', () => {
        expect(trs.id).toBeString();
      });

      it('should have type as number and equal 3', () => {
        // trs.type.should.be.type('number').and.equal(3);
        expect(trs.type).toBeNumber();
        expect(trs.type).toEqual(2);
      });

      it('should have property fee and equals 5 XAS', function() {
        // trs.fee.should.be.type('number').and.equal(5 * 1e8);
        expect(trs.fee).toBeString();
        expect(trs.fee).toEqual(String(5 * 1e8));
      });

      it('should have senderPublicKey property', () => {
        // trs.should.have.property('senderPublicKey').and.be.type('string');
        expect(trs).toHaveProperty('senderPublicKey');
        expect(trs.senderPublicKey).toBeString();
      });

      it('should have timestamp property', () => {
        // trs.should.have.property('timestamp').and.be.type('number');
        expect(trs).toHaveProperty('timestamp');
        expect(trs.timestamp).toBeNumber();
      });

      it('should have senderId property', () => {
        // trs.should.have.property('senderId').and.be.type('string');
        expect(trs).toHaveProperty('senderId');
        expect(trs.senderId).toBeString();
      });

      it('should have publicKey of secondSecret in args array', () => {
        const secondSecret = 'secret2';
        const trs = setSecondSecret('secret', secondSecret);
        expect(trs.args[0]).toEqual(
          'eda5a45e16f43d08ebb51d3c3046c3744cb552be5a4e1fc9c1894d76df7b8536'
        );
      });

      it('should publicKey of secondSecret be in hex array', () => {
        const schema = extendedJoi
          .string()
          .hex(32)
          .required();

        const report = extendedJoi.validate(trs.args[0], schema);
        expect(report.error).toBeNull();
      });
    });
  });
});
