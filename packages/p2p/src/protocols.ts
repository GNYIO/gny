import { NetworkType, IPeer2PeerHandlers } from '@gny/interfaces';

export function createPeer2PeerHandlers(
  protocol: string,
  network: NetworkType
): IPeer2PeerHandlers {
  const peer2peerHandlers: IPeer2PeerHandlers = {
    P2P_VERSION: protocol,
    V1_NEW_BLOCK_PROTOCOL: `/${network}/${protocol}/newBlock`,
    V1_VOTES: `/${network}/${protocol}/votes`,
    V1_COMMON_BLOCK: `/${network}/${protocol}/commonBlock`,
    V1_GET_HEIGHT: `/${network}/${protocol}/getHeight`,
    V1_BLOCKS: `/${network}/${protocol}/blocks`,
    V1_BROADCAST_NEW_BLOCK_HEADER: `/${network}/${protocol}/broadcast/newBlockHeader`,
    V1_BROADCAST_TRANSACTION: `/${network}/${protocol}/broadcast/transaction`,
    V1_BROADCAST_PROPOSE: `/${network}/${protocol}/broadcast/propose`,
    V1_BROADCAST_NEW_MEMBER: `/${network}/${protocol}/broadcast/newMember`,
    V1_BROADCAST_SELF: `/${network}/${protocol}/broadcast/self`,
  };
  return peer2peerHandlers;
}
