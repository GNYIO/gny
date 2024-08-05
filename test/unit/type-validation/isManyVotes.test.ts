import { isManyVotes } from '@gnyio/type-validation';
import { ManyVotes, Signature } from '@gnyio/interfaces';

describe('isManyVotes', () => {
  it('isManyVotes() - passes with valid input', () => {
    const manyVotes: ManyVotes = {
      height: '2',
      id: '135b0010d32d8b2b4b2b60c32e18801eac3c3e8156c9f2ed4c45df9423e9a43c',
      signatures: [],
    };

    const result = isManyVotes(manyVotes);
    return expect(result).toEqual(true);
  });

  it('isManyVotes() - faily with empty object', () => {
    const input = {};

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - fails on undefined', () => {
    const input = undefined;

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - fails on null', () => {
    const input = null;

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - fails when height is minus', () => {
    const input: ManyVotes = {
      height: '-2',
      id: '53c2ae7386e2eb70b7003adcaa42861d9d037e81599368b7acd255cc774fac50',
      signatures: [],
    };

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - fails if height is number, not string', () => {
    const height = (10 as unknown) as string; // cast to satisfy compiler
    const input: ManyVotes = {
      height: height,
      id: '4b16df74cc75007d9438020fdc37ecc4f9d200175d1d888e3524a2bf63726fbb',
      signatures: [],
    };

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - fails if id has not length of 64', () => {
    const input: ManyVotes = {
      height: '10',
      id: 'c5e923b18bee72bc59bb3fd51a5bf23fd4f1bcc69b7522bd982d241efc078aa1'.substring(
        0,
        63
      ),
      signatures: [],
    };

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - fails if id is not hex string', () => {
    const input: ManyVotes = {
      height: '10',
      id: 'z'.repeat(64),
      signatures: [],
    };

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });

  it('isManyVotes() - succeeds if signatures is empty array', () => {
    const input: ManyVotes = {
      height: '11',
      id: 'cdabbf40e8fa77d322c2ce978fe6894816659b55a95d7540b5500c809a044823',
      signatures: [],
    };

    const result = isManyVotes(input);
    return expect(result).toEqual(true);
  });

  it('isManyVotes() - fails signatures has undefined value', () => {
    const oneSignature = (undefined as unknown) as Signature;
    const input: ManyVotes = {
      height: '22',
      id: '',
      signatures: [oneSignature],
    };

    const result = isManyVotes(input);
    return expect(result).toEqual(false);
  });
});
