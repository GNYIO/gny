import { RoundBase } from '../../../src/base/round';

describe('base/round', () => {
  it.skip('calculateRound() - height 0', () => {
    const height = 0;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(1);
  });

  it('calculateRound() - height 1', done => {
    const height = 1;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(1);
    done();
  });

  it('calculateRound() - height 20', done => {
    const height = 20;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(1);
    done();
  });

  it('calculateRound() - height 65', done => {
    const height = 65;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(1);
    done();
  });

  it('calculateRound() - height 101', done => {
    const height = 101;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(1);
    done();
  });

  it('calculateRound() - height 102', done => {
    const height = 102;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(2);
    done();
  });

  it('calculateRound() - height 202', done => {
    const height = 202;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(2);
    done();
  });

  it('calculateRound() - height 203', done => {
    const height = 203;
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(3);
    done();
  });
});
