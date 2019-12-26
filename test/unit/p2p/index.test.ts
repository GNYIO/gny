import { createPeerInfo } from '../../../packages/p2p/src/createPeerInfo';
import {
  ILogger,
  P2PMessage,
  SimplePeerInfo,
} from '../../../packages/interfaces';
import * as PeerInfo from 'peer-info';
import { sleep } from '../../integration/lib';
import { Bundle, LibP2POptions } from '../../../packages/p2p/src/bundle';
import {
  attachEventHandlers,
  extractIpAndPort,
} from '../../../packages/p2p/src/util';

const delay = (x: number): Promise<void> =>
  new Promise(resolve => setInterval(resolve, x));
const getMultiAddr = (peerInfo: PeerInfo): string =>
  peerInfo.multiaddrs.toArray()[0].toString();
const range = (start, end) => {
  const length = end - start + 1;
  const result = Array.from(Array(length), (x, index) => start + index);
  return result;
};
const logger: ILogger = {
  log: x => x,
  trace: x => x,
  debug: x => x,
  info: x => x,
  warn: x => x,
  error: x => x,
  fatal: x => x,
};

async function createNewBundle(
  port: number = 0,
  railing: string[] = [],
  bootstrapInterval?: number
) {
  const peerInfo = await createPeerInfo();
  peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${port}`);

  const bootstrapNode = railing ? [...railing] : [];
  const config = {
    peerInfo,
    config: {
      peerDiscovery: {
        bootstrap: {
          list: bootstrapNode,
          interval: bootstrapInterval,
        },
      },
    },
  };

  const node = new Bundle(config, logger);
  attachEventHandlers(node, logger);

  return node;
}

describe.skip('p2p', () => {
  describe('creation', () => {
    it('constructor() - passing not an array as bootstrapNode into Peer2Peer constructor throws error', async done => {
      const peerInfo = await createPeerInfo();
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${19000}`);

      const WRONG_PEERSTRAPNODE = {} as string[];
      const config = {
        peerInfo,
        config: {
          peerDiscovery: {
            bootstrap: {
              list: WRONG_PEERSTRAPNODE,
            },
          },
        },
      };
      expect(() => new Bundle(config, logger)).toThrowError(
        'bootstrapNode must be array'
      );

      done();
    }, 5000);

    it('constructor() - passing an undefined in bootstrapNode into Peer2Peer constructor throws error', async done => {
      const peerInfo = await createPeerInfo();
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${19000}`);

      const BOOTSTRAPNODE_WITH_UNDEFINED = [undefined] as string[];
      const config: Partial<LibP2POptions> = {
        peerInfo,
        config: {
          peerDiscovery: {
            bootstrap: {
              list: BOOTSTRAPNODE_WITH_UNDEFINED,
            },
          },
        },
      };
      expect(() => new Bundle(config, logger)).toThrowError(
        'no undefined in string[]'
      );

      done();
    });

    it('constructor() - passing a null in bootstrapNode into Peer2Peer constructor throws error', async done => {
      const peerInfo = await createPeerInfo();
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${19000}`);

      const BOOTSTRAPNODE_WITH_UNDEFINED = [null] as string[];
      const config = {
        peerInfo,
        config: {
          peerDiscovery: {
            bootstrap: {
              list: BOOTSTRAPNODE_WITH_UNDEFINED,
            },
          },
        },
      };

      expect(() => new Bundle(config, logger)).toThrowError(
        'no null in string[]'
      );

      done();
    });

    it('start() - after starting node with start() node should be started', async done => {
      expect.assertions(2);

      const node1 = await createNewBundle();
      expect(node1.isStarted()).toEqual(false);

      await node1.start();
      expect(node1.isStarted()).toEqual(true);

      // cleanup
      await node1.stop();
      done();
    });

    it('isStarted() - not started node should return false from isStarted()', async done => {
      expect.assertions(1);

      const node1 = await createNewBundle();
      expect(node1.isStarted()).toEqual(false);
      done();
    });
  });

  describe('stoppage', () => {
    it(
      'stopped node should have still peers in peerBook',
      async done => {
        expect.assertions(2);
        const BOOTSTRAP_INTERVAL = 500; // ms

        const node1 = await createNewBundle();
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(
          5011,
          [node1Address],
          BOOTSTRAP_INTERVAL
        );
        await node2.start();

        await delay(1000);
        expect(node2.peerBook.getAllArray().length).toEqual(1);

        await node2.stop();
        await delay(2000);
        expect(node2.peerBook.getAllArray().length).toEqual(1);

        // cleanup
        await node1.stop();
        done();
      },
      10 * 1000
    );

    it('isStarted() - after stopping node with stop() it should be stopped', async done => {
      expect.assertions(1);
      const node1 = await createNewBundle();
      await node1.start();
      await node1.stop();
      expect(node1.isStarted()).toEqual(false);
      done();
    });
  });

  describe('bootstrap', () => {
    it(
      'node2 should dial to node1 on bootstrap',
      async done => {
        expect.assertions(2);
        const BOOTSTRAP_INTERVAL = 2000; // ms

        const node1 = await createNewBundle(5010);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(
          5011,
          [node1Address],
          BOOTSTRAP_INTERVAL
        );
        await node2.start();

        // wait for periodically bootstrap method to run at least one time
        await delay(5000);

        const node1_knows_about_node2 = node1.peerBook.has(node2.peerInfo);
        expect(node1_knows_about_node2).toEqual(true);

        const node2_knows_about_node1 = node2.peerBook.has(node1.peerInfo);
        expect(node2_knows_about_node1).toEqual(true);

        // cleanup
        await node1.stop();
        await node2.stop();
        done();
      },
      15 * 1000
    );

    it(
      'automatically reconnect to stopped node with bootstrap mechanism',
      async done => {
        expect.assertions(3);

        const node1 = await createNewBundle(26001);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(26002, [node1Address]);
        await node2.start();

        // give the node2 time to connect to node1
        await sleep(1000);

        // node2 is connected to node1
        expect(
          Object.keys(node2._switch.connection.connections).length
        ).toEqual(1);

        // stop node1
        await node1.stop();
        await sleep(4000);

        // node2 is no longer connected to node1
        expect(
          Object.keys(node2._switch.connection.connections).length
        ).toEqual(0);

        // restart node1
        await node1.start();

        await sleep(8000);

        // node2 is again connected to node1
        expect(
          Object.keys(node2._switch.connection.connections).length
        ).toEqual(1);

        // cleanup
        await node1.stop();
        await node2.stop();

        done();
      },
      25 * 1000
    );

    it('started node has no peers in peerBook', async done => {
      const node1 = await createNewBundle(40000);
      await node1.start();

      expect(node1.peerBook.getAllArray().length).toEqual(0);

      await node1.stop();
      done();
    });
  });

  describe('broadcast', () => {
    it('node 1,2,3: node 1 -> 2; and 2 -> 3 are connected. If I broadcast a message from node 3; node 1 should get the message', async done => {
      expect.assertions(4);

      const BOOTSTRAP_INTERVAL = 2000;

      const node1 = await createNewBundle(5000, undefined, BOOTSTRAP_INTERVAL);
      await node1.start();

      const bootstrap_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewBundle(
        5001,
        [bootstrap_for_node2],
        BOOTSTRAP_INTERVAL
      );
      await node2.start();

      const bootstrap_for_node3 = getMultiAddr(node2.peerInfo);
      const node3 = await createNewBundle(
        5002,
        [bootstrap_for_node3],
        BOOTSTRAP_INTERVAL
      );
      await node3.start();

      // node1 & node2 subscribe to events
      node1.subscribeCustom('test', (message: P2PMessage) => {
        expect(message.data.toString()).toBe('from node 3');
        expect(message.from).toBe(node3.peerInfo.id.toB58String());
        expect(message.peerInfo).toEqual(extractIpAndPort(node3.peerInfo));
        expect(message.peerInfo.port).toEqual(5002);
      });
      node2.subscribeCustom('test', (message: P2PMessage) => {
        // necessary to forward message
      });

      // time for nodes to find each other
      await delay(5000);

      // node 3 publishes message
      await node3.broadcastAsync('test', Buffer.from('from node 3'));

      // wait for message to propagate
      await delay(2000);

      // stop all nodes
      await node1.stop();
      await node2.stop();
      await node3.stop();

      done();
    }, 20000);

    it('a pubsub broadcast should not notify own node if broadcasted from own node', async done => {
      expect.assertions(0);

      const node1 = await createNewBundle();
      await node1.start();

      node1.subscribeCustom('shouldNotBeCalled', (message: P2PMessage) => {
        throw new Error('not allowed');
      });

      // broadcast message
      await node1.broadcastAsync('shouldNotBeCalled', Buffer.from('hello'));

      await delay(1000);

      // cleanup
      await node1.stop();
      done();
    }, 2000);

    it(
      'all 20 nodes that only know rendezvous node, should get broadcasted message',
      async done => {
        expect.assertions(20);

        const rendezvousNode = await createNewBundle(10000);
        await rendezvousNode.start();
        const rendezvousNodeAddress = getMultiAddr(rendezvousNode.peerInfo);
        rendezvousNode.subscribeCustom('test', (message: P2PMessage) => {
          // this will be called 1 times
          expect(message.data.toString()).toEqual('hello world');
        });

        // create 20 nodes
        const nodes = await Promise.all(
          range(10001, 10020).map(async x => {
            const singleNodePromise = createNewBundle(
              x,
              [rendezvousNodeAddress],
              100
            );
            return singleNodePromise;
          })
        );

        // start 20 nodes
        await Promise.all(
          nodes.map(async x => {
            return x.start();
          })
        );

        // subscribe 20 nodes to 'test' messages
        nodes.map(x => {
          x.subscribeCustom('test', (message: P2PMessage) => {
            // this will be called 19 times (self-messages are not emitted)
            expect(message.data.toString()).toEqual('hello world');
          });
        });

        await sleep(4000);
        await nodes[10].broadcastAsync('test', Buffer.from('hello world'));
        await sleep(1000);

        // stop all nodes
        await rendezvousNode.stop();
        await Promise.all(
          nodes.map(async x => {
            return x.stop();
          })
        );

        done();
      },
      20 * 1000
    );

    it(
      'node that broadcasted message should be in the peerInfo prop',
      async done => {
        expect.assertions(2);

        const node1 = await createNewBundle(16001);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(16002, [node1Address], 100);
        await node2.start();
        const node2Address = getMultiAddr(node2.peerInfo);

        const node3 = await createNewBundle(16003, [node2Address], 100);
        await node3.start();

        await sleep(4000);

        // nodes need to subscribe in order to forward message
        node1.subscribeCustom('hello', (message: P2PMessage) => {});
        node2.subscribeCustom('hello', (message: P2PMessage) => {});
        node3.subscribeCustom('hello', (message: P2PMessage) => {
          expect(message.peerInfo.port).toEqual(16001);
          expect(message.peerInfo).toEqual(extractIpAndPort(node1.peerInfo));
        });

        await sleep(2000);

        // message will be propagated from 1 -> 2; 2 -> 3
        await node1.broadcastAsync('hello', Buffer.from('I am a Buffer'));

        await sleep(1000);

        // shutdown nodes
        await node1.stop();
        await node2.stop();
        await node3.stop();

        done();
      },
      30 * 1000
    );

    it(
      'peer that broadcasted should get automatically added to peerBook',
      async done => {
        expect.assertions(3);

        const node1 = await createNewBundle(18000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(18001, [node1Address], 100);
        await node2.start();

        const node3 = await createNewBundle(18002, [node1Address], 100);
        await node3.start();

        await sleep(2000);

        // all nodes subscribe to message 'test'
        node1.subscribeCustom('test', (message: P2PMessage) => {});
        node2.subscribeCustom('test', (message: P2PMessage) => {});
        node3.subscribeCustom('test', (message: P2PMessage) => {});

        await sleep(2000);

        await node2.broadcastAsync('test', Buffer.from('msg from space'));

        await sleep(2000);

        // now node3 should have node2 in its peerBook
        const result = node3.peerBook.has(node2.peerInfo);
        expect(result).toEqual(true);

        // node3 should also have node1 in its peerBook
        const result2 = node3.peerBook.has(node1.peerInfo);
        expect(result2).toEqual(true);

        // node3 has exactly 2 peers in its peerBook
        expect(node3.peerBook.getAllArray().length).toEqual(2);

        // cleanup
        await node1.stop();
        await node2.stop();
        await node3.stop();

        done();
      },
      20 * 1000
    );
  });

  describe('dht', () => {
    // waiting for new js-libp2p-kad-dht release
    it(
      'discover peer via periodically DHT random walk',
      async done => {
        expect.assertions(3);

        const BOOTSTRAP_INTERVAL = 1000;
        // const RANDOM_WALK_INTERVAL = 1000;

        const node1 = await createNewBundle(38000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(
          38001,
          [node1Address],
          BOOTSTRAP_INTERVAL /*, RANDOM_WALK_INTERVAL*/
        );
        await node2.start();
        const node2Address = getMultiAddr(node2.peerInfo);

        const node3 = await createNewBundle(
          38002,
          [node2Address],
          BOOTSTRAP_INTERVAL /*, RANDOM_WALK_INTERVAL*/
        );
        await node3.start();

        // wait for all nodes to connect to each other via DHT randomWalk
        await delay(15000);

        // check if all nodes are connected
        expect(node1.peerBook.getAllArray().length).toEqual(2);
        expect(node2.peerBook.getAllArray().length).toEqual(2);
        expect(node3.peerBook.getAllArray().length).toEqual(2);

        await node1.stop();
        await node2.stop();
        await node3.stop();
        done();
      },
      30 * 1000
    );
  });

  describe('getConnectedRandomNode', () => {
    it(
      'getConnectedRandomNode() - returns undefined when there are no peers in peerBook',
      async done => {
        const node1 = await createNewBundle(15000);
        await node1.start();
        const result = await node1.getConnectedRandomNode();

        expect(result).toEqual(undefined);

        // cleanup
        await node1.stop();
        done();
      },
      10 * 1000
    );

    it(
      'getConnectedRandomNode() - returns one peer when one peer is present',
      async done => {
        expect.assertions(2);

        const node1 = await createNewBundle(14000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(14001, [node1Address], 300);
        await node2.start();
        await sleep(1000);

        expect(node1.peerBook.getAllArray().length).toEqual(1);

        // act
        const result = node2.getConnectedRandomNode();
        expect(result).toEqual(extractIpAndPort(node1.peerInfo));

        // cleanup
        await node1.stop();
        await node2.stop();

        done();
      },
      10 * 1000
    );

    it(
      'getConnectedRandomNode() - returns undefined after only peer disconnected',
      async done => {
        const node1 = await createNewBundle(13000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(13001, [node1Address], 500);
        await node2.start();

        await sleep(2000);

        // test before
        expect(node1.getConnectedRandomNode()).toEqual(
          extractIpAndPort(node2.peerInfo)
        );
        expect(node2.getConnectedRandomNode()).toEqual(
          extractIpAndPort(node1.peerInfo)
        );

        // stop node1
        await node1.stop();
        await sleep(2000);

        // test after
        expect(node1.getConnectedRandomNode()).toBeUndefined();
        expect(node2.getConnectedRandomNode()).toBeUndefined();

        // cleanup
        await node2.stop();

        done();
      },
      10 * 1000
    );

    it(
      'getConnectedRandomNode() - returns first or second node even out on 1.000,- calls',
      async done => {
        expect.assertions(5);

        const node1 = await createNewBundle(13000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(13001);
        await node2.start();
        const node2Address = getMultiAddr(node2.peerInfo);

        const node3 = await createNewBundle(
          13002,
          [node1Address, node2Address],
          500
        );
        await node3.start();

        await sleep(2000);

        expect(node3.peerBook.getAllArray().length).toEqual(2);

        let count1 = 0;
        let count2 = 0;
        for (let i = 0; i < 1000; ++i) {
          const randomNode = node3.getConnectedRandomNode();
          if (randomNode.port === 13000) ++count1;
          if (randomNode.port === 13001) ++count2;
        }

        // node1 and node2 should have each 500 (+/-) 30 occurrences
        expect(count1).toBeGreaterThan(450);
        expect(count1).toBeLessThan(550);
        expect(count2).toBeGreaterThan(450);
        expect(count2).toBeLessThan(550);

        // cleanup
        await node1.stop();
        await node2.stop();
        await node3.stop();

        done();
      },
      30 * 1000
    );
  });

  describe('getAllConnectedPeers', () => {
    it(
      'getAllConnectedPeers() - when no peers are present returns empty array',
      async done => {
        const node1 = await createNewBundle(19000);
        await node1.start();

        const result = await node1.getAllConnectedPeers();
        expect(result).toEqual([]);

        // cleanup
        await node1.stop();
        done();
      },
      5 * 1000
    );

    it(
      'getAllConnectedPeers() - returns array of peers with properties: multiaddrs, id, simple',
      async done => {
        const node1 = await createNewBundle(30000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(30001, [node1Address], 500);
        await node2.start();

        // wait that both nodes connect to each other
        await sleep(2000);

        // act on peer1
        const result1 = node1.getAllConnectedPeers();
        expect(result1).toHaveLength(1);
        expect(Object.keys(result1[0])).toEqual(['id', 'multiaddrs', 'simple']);

        const expectedInPeerStoreFromPeer1: SimplePeerInfo = {
          id: {
            id: node2.peerInfo.id.toJSON().id,
            pubKey: node2.peerInfo.id.toJSON().pubKey,
          },
          multiaddrs: node2.peerInfo.multiaddrs
            .toArray()
            .map(x => x.toString()),
          simple: extractIpAndPort(node2.peerInfo),
        };
        expect(result1[0]).toEqual(expectedInPeerStoreFromPeer1);

        // act on peer2
        const result2 = node2.getAllConnectedPeers();
        expect(result2).toHaveLength(1);
        expect(Object.keys(result2[0])).toEqual(['id', 'multiaddrs', 'simple']);

        const expectedInPeerStoreFromPeer2: SimplePeerInfo = {
          id: {
            id: node1.peerInfo.id.toJSON().id,
            pubKey: node1.peerInfo.id.toJSON().pubKey,
          },
          multiaddrs: node1.peerInfo.multiaddrs
            .toArray()
            .map(x => x.toString()),
          simple: extractIpAndPort(node1.peerInfo),
        };
        expect(result2[0]).toEqual(expectedInPeerStoreFromPeer2);

        // cleanup
        await node1.stop();
        await node2.stop();
        done();
      },
      15 * 1000
    );

    it(
      'getAllConnectedPeers() - return only connected peers',
      async done => {
        const node1 = await createNewBundle(40000);
        await node1.start();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(40001, [node1Address], 500);
        await node2.start();

        // wait that both peers connect to each other
        await sleep(2000);

        // check before
        expect(node1.getAllConnectedPeers()).toHaveLength(1);
        expect(node2.getAllConnectedPeers()).toHaveLength(1);

        // stop peer1
        await node1.stop();
        await sleep(2000);

        expect(node1.getAllConnectedPeers()).toHaveLength(0);
        expect(node2.getAllConnectedPeers()).toHaveLength(0);

        // cleanup
        await node2.stop();
        done();
      },
      15 * 1000
    );
  });
});
