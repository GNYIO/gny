import { RoundBase } from '@gny/base';

describe('base/round', () => {
  it('calculateRound() - height 0', () => {
    const height = String(0);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(0));
  });

  it('calculateRound() - height 1', done => {
    const height = String(1);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(1));
    done();
  });

  it('calculateRound() - height 20', done => {
    const height = String(20);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(1));
    done();
  });

  it('calculateRound() - height 65', done => {
    const height = String(65);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(1));
    done();
  });

  it('calculateRound() - height 101', done => {
    const height = String(101);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(1));
    done();
  });

  it('calculateRound() - height 102', done => {
    const height = String(102);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(2));
    done();
  });

  it('calculateRound() - height 201', done => {
    const height = String(201);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(2));
    done();
  });

  it('calculateRound() - height 202', done => {
    const height = String(202);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(2));
    done();
  });

  it('calculateRound() - height 203', done => {
    const height = String(203);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(3));
    done();
  });

  it('calculateRound() - height 1000', done => {
    const height = String(1000);
    const result = RoundBase.calculateRound(height);

    expect(result).toEqual(String(10));
    done();
  });
});
