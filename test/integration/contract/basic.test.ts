import * as Basic from '../../../src/contract/basic';

describe('Consensus', () => {
  let basic;

  beforeEach(done => {
    basic = Basic.default;
    done();
  });

  describe('deleteCreatedVotes', () => {
    beforeEach(done => {
      done();
    });

    it('should delete created votes', done => {
      const validatedVotes = basic.transfer(1, '');
      expect(validatedVotes);
      done();
    });
  });
});
