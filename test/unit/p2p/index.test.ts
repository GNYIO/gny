import { Peer2Peer } from '../../../packages/p2p/index';
import { createPeerInfo } from '../../../packages/p2p/createPeerInfo';
import { ILogger, P2PMessage } from '../../../src/interfaces';


const delay = (x: number): Promise<void> => new Promise((resolve) => setInterval(resolve, x));

async function createNewPeer2PeerNode (port: number = 0, bootstrapNode?: string, bootstrapInterval?: number) {
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
    bootstrapInterval,
  );
  return node;
}

describe('p2p', () => {

  describe('creation', () => {
    it('after starting node with startAsync() it should be started', async (done) => {
      expect.assertions(1);
      const node1 = await createNewPeer2PeerNode();
      await node1.startAsync();
      expect(node1.isStarted()).toBeTruthy();
      await node1.stopAsync();
      done();
    });

    it('not started node should return false from isStarted()', async (done) => {
      expect.assertions(1);
      const node1 = await createNewPeer2PeerNode();
      expect(node1.isStarted()).toBeFalsy();
      done();
    });

    it('after stopping node with stopAsync() it should be stopped', async (done) => {
      expect.assertions(1);
      const node1 = await createNewPeer2PeerNode();
      await node1.startAsync();
      await node1.stopAsync();
      expect(node1.isStarted()).toBeFalsy();
      done();
    });

    // it.skip('starting two p2p-nodes on the same port results in a EADDRINUSE in use error', async (done) => {
    //   const node1 = await createNewPeer2PeerNode(6000);
    //   const node2 = await createNewPeer2PeerNode(6000);

    //   await node1.startAsync();
    //   await node2.startAsync();
    // }, 2000);
  });

  describe('shutodwn', () => {
    it.skip('shutdown node should have no peers in peerBook', async (done) => {
      done();
    });
  });

  describe('bootstrap', () => {
    it('node2 should dial to node1 on bootstrap', async (done) => {
      const node1 = await createNewPeer2PeerNode(5010);
      await node1.startAsync();

      const BOOTSTRAP_INTERVAL = 2000; // ms
      const bootstrap_address_for_node2 = node1.peerInfo.multiaddrs.toArray()[0].toString();
      const node2 = await createNewPeer2PeerNode(5011, bootstrap_address_for_node2, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      // wait for periodically bootstrap method to run at least one time
      await delay(5000);

      const info2 = node2.peerInfo;
      const node1_know_about_node2 = node1.peerBook.has(info2);
      expect(node1_know_about_node2).toBeTruthy();

      const info1 = node1.peerInfo;
      const node2_knows_about_node1 = node2.peerBook.has(info1);
      expect(node2_knows_about_node1).toBeTruthy();

      // cleanup
      await node1.stopAsync();
      await node2.stopAsync();
      done();
    }, 20000);

    it('reconnect to stopped node with bootstrap mechanism', async (done) => {
      expect.assertions(3);

      const node1 = await createNewPeer2PeerNode(6001);
      await node1.startAsync();

      const BOOTSTRAP_INTERVAL = 2000; // ms

      const node1_address = node1.peerInfo.multiaddrs.toArray()[0].toString();
      const node2 = await createNewPeer2PeerNode(6002, node1_address, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      // give the node2 time to connect to node1
      await delay(3000);
      expect(node2.peerBook.getAllArray().length).toEqual(1);

      // stop node1 and restart
      await node1.stopAsync();
      await delay(1000);
      expect(node2.peerBook.getAllArray().length).toEqual(0);

      await delay(1000);
      await node1.startAsync();

      await delay(3000);
      expect(node2.peerBook.getAllArray().length).toEqual(1);

      // cleanup
      await node1.stopAsync();
      await node2.stopAsync();

      done();
    }, 20000);

    it.skip('started node has no peers in peerBook', async (done) => {
      done();
    });
    it.skip('stop node that had 1 peer in peerBook has no peers on restart in peerBook', async (done) => {
      done();
    });
  });

  describe('broadcast', () => {
    it('node 1,2,3: node 1 -> 2; and 2 -> 3 are connected. If I broadcast a message from node 1; node 3 should get the message', async (done) => {
      expect.assertions(3);
      const BOOTSTRAP_INTERVAL = 2000;

      const node1 = await createNewPeer2PeerNode(5000, undefined, BOOTSTRAP_INTERVAL);
      await node1.startAsync();

      const bootstrap_for_node2 = node1.peerInfo.multiaddrs.toArray()[0].toString();
      const node2 = await createNewPeer2PeerNode(5001, bootstrap_for_node2, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      const bootstrap_for_node3 = node2.peerInfo.multiaddrs.toArray()[0].toString();
      const node3 = await createNewPeer2PeerNode(5002, bootstrap_for_node3, BOOTSTRAP_INTERVAL);
      await node3.startAsync();

      // node1 & node2 subscribe to events
      node1.subscribe('test', (message: P2PMessage) => {
        expect(message.data.toString()).toBe('from node 3');
        expect(message.from).toBe(node3.peerInfo.id.toB58String());
        expect(message.peerInfo).toEqual({ host: '127.0.0.1', port: 5002 });
      });
      node2.subscribe('test', (message: P2PMessage) => {
        // necessary to forward message
      });

      // time for nodes to find each other
      await delay(5000);

      // node 3 publishes message
      await node3.broadcastAsync('test', Buffer.from('from node 3'));

      // wait for message to propagate
      await delay(2000);

      // stop all nodes
      await node1.stopAsync();
      await node2.stopAsync();
      await node3.stopAsync();

      done();
    }, 20000);
  });

  // node creation
    // should start node async
    // should start node with callback
    // should stop node async
    // should stop node with callback
    // should stop if on tcp-port is already in use from an http-server
    // should stop if tcp-port is already in use from other p2p-node
  // broadcast
    // node 1, 2, 3; nodes 1 -> 2; and 2 -> 3 are connected. If I broadcast a message from node 1; node 3 should get the message with the "from" field from node 1
    // like the test before, only that node 2 and 3 should have the node 1 in their peerBook
    // broadcasts shouldn't get "notified" if broadcasted from own server
    // (normally) we only receive the "from" (simple string) from a broadcasted message; test that the message.peerInfo is correctly applied to the message
    // node that broadcasted message should be in the peerInfo
    // same broadcasted message should be "notified" just once
  // bootstrap
    // connect periodically to "bootstrap" node
    // reconnect periodically to the "bootstrap" node, even if the bootstrap node is down for a few seconds
});