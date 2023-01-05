import { jest } from '@jest/globals';
import {
  LoaderHelper,
  PeerIdCommonBlockHeight,
  createRandomPeerId,
} from '@gny/main/loaderhelper';
import { IBlock } from '@gny/interfaces';
import { randomBytes } from 'crypto';

describe('LoaderHelper', () => {
  describe('getIdSequence2', () => {
    it('getIdSequence2() - returns the 4 last blockIds in descending order (happy path)', async () => {
      const currentLastBlockHeight = String(59);

      const blocksAscending = [
        {
          height: String(55),
          id: 'fivefive',
        },
        {
          height: String(56),
          id: 'fivesix',
        },
        {
          height: String(57),
          id: 'fiveseven',
        },
        {
          height: String(58),
          id: 'fiveeight',
        },
        {
          height: String(59),
          id: 'fivenine',
        },
      ] as IBlock[];
      const getBlocksByHeightRange: jest.Mock<
        any
      > = jest.fn().mockImplementation(() => Promise.resolve(blocksAscending));

      // act
      const result = await LoaderHelper.getIdSequence2(
        currentLastBlockHeight,
        getBlocksByHeightRange
      );

      expect(result).toHaveProperty('min', String(55));
      expect(result).toHaveProperty('max', String(59));
      expect(result).toHaveProperty('ids', [
        'fivenine',
        'fiveeight',
        'fiveseven',
        'fivesix',
        'fivefive',
      ]);
    });

    it('getIdSequence2() - throws Error with "getIdSequence2 failed" if something goes wrong', async () => {
      // preparation
      const currentLastBlockHeight = String(30);

      const getBlocksByHeightRangeMock: jest.Mock<
        any
      > = jest
        .fn()
        .mockImplementation(() => Promise.reject('something wrong happend'));

      // act
      const resultPromise = LoaderHelper.getIdSequence2(
        currentLastBlockHeight,
        getBlocksByHeightRangeMock
      );

      return expect(resultPromise).rejects.toHaveProperty(
        'message',
        'getIdSequence2 failed'
      );
    });
  });

  describe('syncStrategy', () => {
    function createRandomBytes() {
      const bytes = randomBytes(16);
      return bytes;
    }

    function createPeerIdCommonBlockHeight(
      commonBlocHeight: string,
      height: string
    ) {
      const peerBytes = createRandomBytes();
      const commonBlock = {
        height: String(commonBlocHeight),
      } as IBlock;

      const result: PeerIdCommonBlockHeight = {
        peerId: createRandomPeerId(peerBytes),
        height: String(height),
        commonBlock: commonBlock,
      };
      return result;
    }

    it('syncStrategy() - no peers should -> "forge"', () => {
      const peers: PeerIdCommonBlockHeight[] = [];
      const lastBlock = {
        height: String(0),
      } as IBlock;

      const result = LoaderHelper.syncStrategy(peers, lastBlock);
      const expectedResult = {
        action: 'forge',
      };
      return expect(result).toEqual(expectedResult);
    });

    it('syncStrategy() - we are at height 0 only one peer at height 0 -> "forge"', () => {
      const lastBlock = {
        height: String(0),
      } as IBlock;

      const peer1 = createPeerIdCommonBlockHeight('0', '0');
      const peers: PeerIdCommonBlockHeight[] = [];
      peers.push(peer1);

      const result = LoaderHelper.syncStrategy(peers, lastBlock);
      const expectedResult = {
        action: 'forge',
      };
      return expect(result).toEqual(expectedResult);
    });

    it('syncStrategy() - we are at height 0 only one peer at height 1 -> "sync"', () => {
      const lastBlock = {
        height: String(0),
      } as IBlock;

      const peer1 = createPeerIdCommonBlockHeight('0', '1');
      const peers: PeerIdCommonBlockHeight[] = [];
      peers.push(peer1);

      const result = LoaderHelper.syncStrategy(peers, lastBlock);
      const expectedResult = {
        action: 'sync',
        peerToSyncFrom: peer1.peerId,
      };
      return expect(result).toEqual(expectedResult);
    });

    it('syncStrategy() - we are at height 0, three peers[h6, h7, h5] -> "sync" from highest', () => {
      const lastBlock = {
        height: String(0),
      } as IBlock;

      const peer1 = createPeerIdCommonBlockHeight('0', '6');
      const peer2 = createPeerIdCommonBlockHeight('0', '7');
      const peer3 = createPeerIdCommonBlockHeight('0', '5');
      const peers: PeerIdCommonBlockHeight[] = [];
      peers.push(peer1);
      peers.push(peer2);
      peers.push(peer3);

      const result = LoaderHelper.syncStrategy(peers, lastBlock);
      const expectedResult = {
        action: 'sync',
        peerToSyncFrom: peer2.peerId,
      };
      return expect(result).toEqual(expectedResult);
    });

    it('syncStrategy() - we are at height 5, one peer at height 12 -> "sync" from highest', () => {
      const lastBlock = {
        height: String(5),
      } as IBlock;

      const peer1 = createPeerIdCommonBlockHeight('5', '12');
      const peers: PeerIdCommonBlockHeight[] = [];
      peers.push(peer1);

      const result = LoaderHelper.syncStrategy(peers, lastBlock);
      const expectedResult = {
        action: 'sync',
        peerToSyncFrom: peer1.peerId,
      };
      return expect(result).toEqual(expectedResult);
    });

    it('syncStrategy() - we are at height 5, peers[h3,h8,h7] -> "sync" from highest', () => {
      const lastBlock = {
        height: String(5),
      } as IBlock;

      const peer1 = createPeerIdCommonBlockHeight('3', '3');
      const peer2 = createPeerIdCommonBlockHeight('5', '8');
      const peer3 = createPeerIdCommonBlockHeight('5', '7');
      const peers: PeerIdCommonBlockHeight[] = [];
      peers.push(peer1);
      peers.push(peer2);
      peers.push(peer3);

      const result = LoaderHelper.syncStrategy(peers, lastBlock);
      const expectedResult = {
        action: 'sync',
        peerToSyncFrom: peer2.peerId,
      };
      return expect(result).toEqual(expectedResult);
    });
  });
});
