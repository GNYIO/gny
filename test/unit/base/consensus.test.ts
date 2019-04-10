import { Consensus } from '../../../src/base/consensus';
import { IScope, ManyVotes, KeyPair, IBlock } from '../../../src/interfaces';
import extendedJoi from '../../../src/utils/extendedJoi';
import { Block } from '../../../src/base/block';

import { createKeypair, createBlock } from './block.test';

function createVotes() {
  const votes: ManyVotes = {
    height: 1,
    id: 'sdfsfsdf',
    signatures: [],
  };

  return votes;
}

describe('Consensus', () => {
  let consensusBase;
  let blockBase;

  const iScope = {
    joi: extendedJoi,
  } as IScope;

  beforeEach(done => {
    consensusBase = new Consensus(iScope);
    blockBase = new Block(iScope);
    done();
  });

  // describe('normalizeVotes', () => {
  //   let votes;

  //   beforeEach(done => {
  //     votes = createVotes();
  //     done();
  //   });

  //   it('should return the normalized votes', done => {
  //     const normalizedVotes = consensusBase.normalizeVotes(votes);
  //     expect(normalizedVotes).toBe(votes);
  //     done();
  //   });
  // });

  describe('createVotes', () => {
    let block;
    let keypairs;

    beforeEach(done => {
      const keypair = createKeypair();
      keypairs = [keypair];
      block = createBlock(1, keypair);
      block.signature = blockBase.sign(block, keypair);
      block.id = blockBase.getId(block);
      done();
    });

    it('should return the normalized votes', done => {
      const votes = consensusBase.createVotes(keypairs, block);
      expect(votes).toHaveProperty('height');
      expect(votes).toHaveProperty('id');
      expect(votes).toHaveProperty('signatures');
      done();
    });
  });
});
