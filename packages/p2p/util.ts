import * as Multiaddr from 'multiaddr';

export function extractIpAndPort(peerInfo) {
  peerInfo.multiaddrs.forEach(one => {
    const multi = Multiaddr(one);
    if (multi.toString().includes('tcp') && multi.toString().includes('ip4')) {
      const y = multi.nodeAddress();
      return {
        ip: y.address,
        port: y.port,
      };
    }
  });
  return undefined;
}