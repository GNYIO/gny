import { NetworkType, IPeer2PeerHandlers } from '@gny/interfaces';

export function createPeer2PeerHandlers(
  protocol: string,
  network: NetworkType,
  partialGenesisId: string
): IPeer2PeerHandlers {
  const peer2peerHandlers: IPeer2PeerHandlers = {
    P2P_VERSION: protocol,
    P2P_PARTIAL_GENESIS_ID: partialGenesisId,
    V1_NEW_BLOCK_PROTOCOL: `/${network}/${protocol}/${partialGenesisId}/newBlock`,
    V1_VOTES: `/${network}/${protocol}/${partialGenesisId}/votes`,
    V1_COMMON_BLOCK: `/${network}/${protocol}/${partialGenesisId}/commonBlock`,
    V1_GET_HEIGHT: `/${network}/${protocol}/${partialGenesisId}/getHeight`,
    V1_BLOCKS: `/${network}/${protocol}/${partialGenesisId}/blocks`,
    V1_BROADCAST_NEW_BLOCK_HEADER: `/${network}/${protocol}/${partialGenesisId}/broadcast/newBlockHeader`,
    V1_BROADCAST_TRANSACTION: `/${network}/${protocol}/${partialGenesisId}/broadcast//transaction`,
    V1_BROADCAST_PROPOSE: `/${network}/${protocol}/${partialGenesisId}/broadcast//propose`,
    V1_BROADCAST_NEW_MEMBER: `/${network}/${protocol}/${partialGenesisId}/broadcast/newMember`,
    V1_BROADCAST_SELF: `/${network}/${protocol}/${partialGenesisId}/broadcast/self`,
  };
  return peer2peerHandlers;
}
