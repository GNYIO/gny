import * as gnyClient from '../index';
import should = require('should');

describe('basic', () => {
  const basic = gnyClient.basic;

  it('should be ok', () => {
    basic.should.be.ok;
  });

  it('should be object', () => {
    basic.should.be.type('object');
  });

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
      basic.should.have.property('setName');
    });

    it('should be function', () => {
      setName.should.be.type('function');
    });

    it('should create setName transaction', () => {
      trs.should.be.ok;
      trs.should.be.type('object');
    });

    describe('returned setName transaction', () => {
      it('should have id as string', () => {
        trs.id.should.be.type('string');
      });

      it('should have type as number and equal 2', () => {
        trs.type.should.be.type('number').and.equal(2);
      });

      describe('fee calculation', () => {
        it('fee for 2 character nickname is 200 XAS', () => {
          const nickname = 'a'.repeat(2);
          trs = setName(nickname, 'secret', 'second secret');
          trs.fee.should.be.type('number').and.equal(200 * 1e8);
        });

        it('fee for 3 character nickname is 100 XAS', () => {
          const nickname = 'b'.repeat(3);
          trs = setName(nickname, 'secret', 'second secret');
          trs.fee.should.be.type('number').and.equal(100 * 1e8);
        });

        it('fee for 4 character nickname is 80 XAS', () => {
          const nickname = 'c'.repeat(4);
          trs = setName(nickname, 'secret', 'second secret');
          trs.fee.should.be.type('number').and.equal(80 * 1e8);
        });

        it('fee for 5 character nickname is 40 XAS', () => {
          const nickname = 'd'.repeat(5);
          trs = setName(nickname, 'secret', 'second secret');
          trs.fee.should.be.type('number').and.equal(40 * 1e8);
        });

        it('fee for 10 character nickname is 10 XAS', () => {
          const nickname = 'e'.repeat(10);
          trs = setName(nickname, 'secret', 'second secret');
          trs.fee.should.be.type('number').and.equal(10 * 1e8);
        });

        it('fee for 15 character nickname is 1 XAS', () => {
          const nickname = 'f'.repeat(15);
          trs = setName(nickname, 'secret', 'second secret');
          trs.fee.should.be.type('number').and.equal(1 * 1e8);
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
      basic.should.have.property('setSecondSecret');
    });

    it('setSecondSecret should create transaction', () => {
      trs = setSecondSecret('secret', 'second secret');
      trs.should.be.ok;
      trs.should.be.type('object');
    });

    describe('returned setSecondSecret transaction', () => {
      it('should have id as string', () => {
        trs.id.should.be.type('string');
      });

      it('should have type as number and equal 3', () => {
        trs.type.should.be.type('number').and.equal(3);
      });

      it('should have property fee and equals 5 XAS', function() {
        trs.fee.should.be.type('number').and.equal(5 * 1e8);
      });

      it('should have senderPublicKey property', () => {
        trs.should.have.property('senderPublicKey').and.be.type('string');
      });

      it('should have timestamp property', () => {
        trs.should.have.property('timestamp').and.be.type('number');
      });

      it('should have senderId property', () => {
        trs.should.have.property('senderId').and.be.type('string');
      });

      it('should have publicKey of secondSecret in args array', () => {
        const secondSecret = 'secret2';
        const trs = setSecondSecret('secret', secondSecret);

        trs.args[0].should.equal(
          'eda5a45e16f43d08ebb51d3c3046c3744cb552be5a4e1fc9c1894d76df7b8536'
        );
      });

      it('should publicKey of secondSecret be in hex array', () => {
        should(trs.args[0])
          .be.type('string')
          .and.match(() => {
            try {
              new Buffer(trs.args[0]);
            } catch (e) {
              return false;
            }

            return true;
          });
      });
    });
  });
});
