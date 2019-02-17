import { Peer2Peer } from '../../../packages/p2p/index';
import { createPeerInfo } from '../../../packages/p2p/createPeerInfo';
import { ILogger } from '../../../src/interfaces';

async function createNewPeer2PeerNode (port: number = 0, bootstrapNode?: string) {
  const logger: ILogger = {
    log: (x) => x,
    trace: (x) => x,
    debug: (x) => x,
    info: (x) => x,
    warn: (x) => x,
    error: (x) => x,
    fatal: (x) => x,
  };

  const peerInfo = await createPeerInfo();
  peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${port}`);

  const node = new Peer2Peer(
    logger,
    peerInfo,
    bootstrapNode,
  );
  return node;
}

describe('p2p', () => {
  let node1;
  let node2;
  beforeEach(async (done) => {
    node1 = await createNewPeer2PeerNode();
    node2 = await createNewPeer2PeerNode();

    done();
  });

  it('after starting node isStarted() should be true', async (done) => {
    await node1.startAsync();
    expect(node1.isStarted()).toBeTruthy();
    done();
  });

  it.skip('starting two p2p-nodes on the same port results in a EADDRINUSE in use error', async (done) => {
    node1 = await createNewPeer2PeerNode(6000);
    try {
      node2 = await createNewPeer2PeerNode(6000);
    } catch (err) {
      done();
    }
  });

  it.only('node2 should dial to node1 on bootstrap', async (done) => {

    node2 = await createNewPeer2PeerNode(undefined, node1.peerInfo);

    await node1.startAsync();
    await node2.startAsync();

    console.log(JSON.stringify(node1.peer));

    // TODO: add checks if the two are connected
    done();

    // TODO: REAd ----> https://medium.com/@mtiller/debugging-with-typescript-jest-ts-jest-and-visual-studio-code-ef9ca8644132

    // thread: https://github.com/kulshekhar/ts-jest/issues/46
  });


  // node creation
    // should start node async
    // should start node with callback
    // should stop node async
    // should stop node with callback
    // should stop if on tcp-port is already in use from an http-server
    // should stop if tcp-port is already in use from other p2p-node
});