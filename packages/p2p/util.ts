import * as Multiaddr from 'multiaddr';

export function extractIpAndPort(peerInfo) {
  let result = undefined;

  const arr = peerInfo.multiaddrs.toArray();
  for (let i = 0; i < arr.length; ++i) {
    const one = arr[i];
    const multi = Multiaddr(one);
    if (multi.toString().includes('tcp') && multi.toString().includes('ip4')) {
      const y = multi.nodeAddress();
      result = {
        host: y.address,
        port: y.port,
      };
      break;
    }
  }
  return result;
}