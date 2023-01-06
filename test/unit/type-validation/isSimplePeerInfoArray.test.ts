import { isSimplePeerInfoArray } from '@gny/type-validation';

function createPeerArray() {
  const peers = [
    {
      id: {
        id: 'QmZDS25zCNSNHUmwSmgGas6aqeGcuE9x1jdZRJdAybXcQs',
        pubKey: null,
      },
      multiaddrs: [
        '/ip4/159.69.80.171/tcp/4097/p2p/QmZDS25zCNSNHUmwSmgGas6aqeGcuE9x1jdZRJdAybXcQs',
      ],
      simple: {
        host: '159.69.80.171',
        port: 4097,
      },
    },
  ];
  return peers;
}

describe('isSimplePeerInfoArray', () => {
  it('isSimplePeerInfoArray() - passes with valid input', () => {
    const peers = createPeerArray();

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(true);
  });

  it('isSimplePeerInfoArray() - fails with missing id property', () => {
    const peers = createPeerArray();
    delete peers[0].id;

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(false);
  });

  it('isSimplePeerInfoArray() - fails with missing multiaddr property', () => {
    const peers = createPeerArray();
    delete peers[0].multiaddrs;

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(false);
  });

  it('isSimplePeerInfoArray() - fails with missing simple property', () => {
    const peers = createPeerArray();
    delete peers[0].simple;

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(false);
  });

  it('isSimplePeerInfoArray() - fails when multiaddr has 0 elements', () => {
    const peers = createPeerArray();
    peers[0].multiaddrs.pop();

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(false);
  });

  it('isSimplePeerInfoArray() - fails when multiaddr has 2 elements', () => {
    const peers = createPeerArray();
    peers[0].multiaddrs.push(
      '/ip4/159.69.80.171/tcp/4097/p2p/QmZDS25zCNSNHUmwSmgGas6aqeGcuE9x1jdZRJdAybXcQs'
    );

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(false);
  });

  it('isSimplePeerInfoArray() - success with multiple elements in array', () => {
    const peers1 = createPeerArray();
    const peers2 = createPeerArray();

    const peers = [peers1[0], peers2[0]];

    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(true);
  });

  it('isSimplePeerInfoArray() - success with empty array', () => {
    const peers = [];
    const result = isSimplePeerInfoArray(peers);
    return expect(result).toEqual(true);
  });
});
