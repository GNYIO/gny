import { Peer2Peer } from '../../../packages/p2p/index';
import { createPeerInfo } from '../../../packages/p2p/createPeerInfo';
import { ILogger, P2PMessage } from '../../../src/interfaces';
import * as PeerInfo from 'peer-info';

const delay = (x: number): Promise<void> => new Promise((resolve) => setInterval(resolve, x));
const getMultiAddr = (peerInfo: PeerInfo): string => peerInfo.multiaddrs.toArray()[0].toString();

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



    // it.skip('starting two p2p-nodes on the same port results in a EADDRINUSE in use error', async (done) => {
    //   const node1 = await createNewPeer2PeerNode(6000);
    //   const node2 = await createNewPeer2PeerNode(6000);

    //   await node1.startAsync();
    //   await node2.startAsync();
    // }, 2000);
  });

  describe('stoppage', () => {
    it('stopped node should have no peers in peerBook', async (done) => {
      expect.assertions(2);
      const BOOTSTRAP_INTERVAL = 500; // ms

      const node1 = await createNewPeer2PeerNode();
      await node1.startAsync();

      const bootstrap_address_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewPeer2PeerNode(5011, bootstrap_address_for_node2, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      await delay(1000);
      expect(node2.peerBook.getAllArray().length).toEqual(1);

      await node2.stopAsync();
      expect(node2.peerBook.getAllArray().length).toEqual(0);

      // cleanup
      await node1.stopAsync();
      done();
    }, 5000);

    it('after stopping node with stopAsync() it should be stopped', async (done) => {
      expect.assertions(1);
      const node1 = await createNewPeer2PeerNode();
      await node1.startAsync();
      await node1.stopAsync();
      expect(node1.isStarted()).toBeFalsy();
      done();
    });
  });

  describe('bootstrap', () => {
    it('node2 should dial to node1 on bootstrap', async (done) => {
      expect.assertions(2);

      const node1 = await createNewPeer2PeerNode(5010);
      await node1.startAsync();

      const BOOTSTRAP_INTERVAL = 2000; // ms
      const bootstrap_address_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewPeer2PeerNode(5011, bootstrap_address_for_node2, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      // wait for periodically bootstrap method to run at least one time
      await delay(5000);

      const node1_knows_about_node2 = node1.peerBook.has(node2.peerInfo);
      expect(node1_knows_about_node2).toBeTruthy();

      const node2_knows_about_node1 = node2.peerBook.has(node1.peerInfo);
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

      const node1_addr = getMultiAddr(node1.peerInfo);
      const node2 = await createNewPeer2PeerNode(6002, node1_addr, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      // give the node2 time to connect to node1
      await delay(3000);
      expect(node2.peerBook.getAllArray().length).toEqual(1);

      // stop node1
      await node1.stopAsync();
      await delay(1000);
      expect(node2.peerBook.getAllArray().length).toEqual(0);

      // restart node1
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
    it.skip('multiaddr-string passed as bootstrap node connect nodes', async (done) => {});

    it.skip('connect periodically to "bootstrap" node', async (done) => {
      done();
    });
  });

  describe('broadcast', () => {
    it('node 1,2,3: node 1 -> 2; and 2 -> 3 are connected. If I broadcast a message from node 1; node 3 should get the message', async (done) => {
      expect.assertions(3);

      const BOOTSTRAP_INTERVAL = 2000;

      const node1 = await createNewPeer2PeerNode(5000, undefined, BOOTSTRAP_INTERVAL);
      await node1.startAsync();

      const bootstrap_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewPeer2PeerNode(5001, bootstrap_for_node2, BOOTSTRAP_INTERVAL);
      await node2.startAsync();

      const bootstrap_for_node3 = getMultiAddr(node2.peerInfo);
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

    it('a broadcast should not notify own node if broadcasted from own server', async (done) => {
      expect.assertions(0);

      const node1 = await createNewPeer2PeerNode();
      await node1.startAsync();

      node1.subscribe('shouldNotBeCalled', (message: P2PMessage) => {
        throw new Error('not allowed');
      });

      // broadcast message
      await node1.broadcastAsync('shouldNotBeCalled', Buffer.from('hello'));

      await delay(1000);

      // cleanup
      await node1.stopAsync();
      done();
    }, 2000);
  });

  describe('dht', () => {
    it.skip('discover peer via periodically DHT random walk', async (done) => {
      done();
    });
  });
  // node creation
    // should start node async
    // should start node with callback
    // should stop node async
    // should stop node with callback
    // should stop if on tcp-port is already in use from an http-server
    // should stop if tcp-port is already in use from other p2p-node
  // broadcast
    // broadcasts shouldn't get "notified" if broadcasted from own server
    // node that broadcasted message should be in the peerInfo
    // same broadcasted message should be "notified" just once
});