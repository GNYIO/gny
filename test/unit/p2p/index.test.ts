import { createPeerInfo } from '../../../packages/p2p/createPeerInfo';
import { ILogger, P2PMessage, PeerNode } from '../../../src/interfaces';
import * as PeerInfo from 'peer-info';
import { sleep } from '../../integration/lib';
import { Bundle } from '../../../packages/p2p/bundle';

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
  return node;
}

describe('p2p', () => {
  describe('creation', () => {
    it('constructor() - passing not an array as bootstrapNode into Peer2Peer constructor throws error', async done => {
      const peerInfo = await createPeerInfo();
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${19000}`);

      const WRONG_PEERSTRAPNODE = {} as string[];
      expect(
        () => new Peer2Peer(logger, peerInfo, WRONG_PEERSTRAPNODE)
      ).toThrowError('bootstrapNode must be array');

      done();
    }, 5000);

    it('constructor() - passing an undefined in bootstrapNode into Peer2Peer constructor throws error', async done => {
      const peerInfo = await createPeerInfo();
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${19000}`);

      const PEERSTRAPNODE_WITH_UNDEFINED = [undefined] as string[];
      expect(
        () => new Peer2Peer(logger, peerInfo, PEERSTRAPNODE_WITH_UNDEFINED)
      ).toThrowError('no undefined in string[]');

      done();
    });

    it('constructor() - passing an null in bootstrapNode into Peer2Peer constructor throws error', async done => {
      const peerInfo = await createPeerInfo();
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/${19000}`);

      const PEERSTRAPNODE_WITH_UNDEFINED = [null] as string[];
      expect(
        () => new Peer2Peer(logger, peerInfo, PEERSTRAPNODE_WITH_UNDEFINED)
      ).toThrowError('no null in string[]');

      done();
    });

    it('startAsync() - after starting node with startAsync() it should be started', async done => {
      expect.assertions(2);

      const node1 = await createNewBundle();
      expect(node1.isStarted()).toEqual(false);

      await node1.startAsync();
      expect(node1.isStarted()).toEqual(true);

      // cleanup
      await node1.stopAsync();
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
    it('stopped node should have no peers in peerBook', async done => {
      expect.assertions(2);
      const BOOTSTRAP_INTERVAL = 500; // ms

      const node1 = await createNewBundle();
      await node1.startAsync();

      const bootstrap_address_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewBundle(
        5011,
        [bootstrap_address_for_node2],
        BOOTSTRAP_INTERVAL
      );
      await node2.startAsync();

      await delay(1000);
      expect(node2.peerBook.getAllArray().length).toEqual(1);

      await node2.stopAsync();
      expect(node2.peerBook.getAllArray().length).toEqual(0);

      // cleanup
      await node1.stopAsync();
      done();
    }, 5000);

    it('after stopping node with stopAsync() it should be stopped', async done => {
      expect.assertions(1);
      const node1 = await createNewBundle();
      await node1.startAsync();
      await node1.stopAsync();
      expect(node1.isStarted()).toBeFalsy();
      done();
    });
  });

  describe('bootstrap', () => {
    it('node2 should dial to node1 on bootstrap', async done => {
      expect.assertions(2);

      const node1 = await createNewBundle(5010);
      await node1.startAsync();

      const BOOTSTRAP_INTERVAL = 2000; // ms
      const bootstrap_address_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewBundle(
        5011,
        [bootstrap_address_for_node2],
        BOOTSTRAP_INTERVAL
      );
      await node2.startAsync();

      // wait for periodically bootstrap method to run at least one time
      await delay(5000);

      const node1_knows_about_node2 = node1.peerBook.has(node2.peerInfo);
      expect(node1_knows_about_node2).toEqual(true);

      const node2_knows_about_node1 = node2.peerBook.has(node1.peerInfo);
      expect(node2_knows_about_node1).toEqual(true);

      // cleanup
      await node1.stopAsync();
      await node2.stopAsync();
      done();
    }, 20000);

    it.skip(
      'disconnect nodes are kept in peerBook',
      async done => {
        done();
      },
      10 * 1000
    );

    it.only(
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
      await node1.startAsync();

      expect(node1.peerBook.getAllArray().length).toEqual(0);

      await node1.stopAsync();
      done();
    });
  });

  describe('broadcast', () => {
    it('node 1,2,3: node 1 -> 2; and 2 -> 3 are connected. If I broadcast a message from node 3; node 1 should get the message', async done => {
      expect.assertions(3);

      const BOOTSTRAP_INTERVAL = 2000;

      const node1 = await createNewBundle(5000, undefined, BOOTSTRAP_INTERVAL);
      await node1.startAsync();

      const bootstrap_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewBundle(
        5001,
        [bootstrap_for_node2],
        BOOTSTRAP_INTERVAL
      );
      await node2.startAsync();

      const bootstrap_for_node3 = getMultiAddr(node2.peerInfo);
      const node3 = await createNewBundle(
        5002,
        [bootstrap_for_node3],
        BOOTSTRAP_INTERVAL
      );
      await node3.startAsync();

      // node1 & node2 subscribe to events
      node1.subscribeCustom('test', (message: P2PMessage) => {
        expect(message.data.toString()).toBe('from node 3');
        expect(message.from).toBe(node3.peerInfo.id.toB58String());
        expect(message.peerInfo).toEqual({ host: '127.0.0.1', port: 5002 });
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
      await node1.stopAsync();
      await node2.stopAsync();
      await node3.stopAsync();

      done();
    }, 20000);

    it('a broadcast should not notify own node if broadcasted from own server', async done => {
      expect.assertions(0);

      const node1 = await createNewBundle();
      await node1.startAsync();

      node1.subscribeCustom('shouldNotBeCalled', (message: P2PMessage) => {
        throw new Error('not allowed');
      });

      // broadcast message
      await node1.broadcastAsync('shouldNotBeCalled', Buffer.from('hello'));

      await delay(1000);

      // cleanup
      await node1.stopAsync();
      done();
    }, 2000);

    it(
      'all 20 nodes that only know rendezvous node, should get broadcasted message',
      async done => {
        expect.assertions(20);

        const rendezvousNode = await createNewBundle(10000);
        await rendezvousNode.startAsync();
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
            return x.startAsync();
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
        await sleep(200);

        // stop all nodes
        await rendezvousNode.stopAsync();
        await Promise.all(
          nodes.map(async x => {
            return x.stopAsync();
          })
        );

        done();
      },
      20 * 1000
    );

    it(
      'node that broadcasted message should be in the peerInfo prop',
      async done => {
        expect.assertions(1);

        const node1 = await createNewBundle(16001);
        await node1.startAsync();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(16002, [node1Address], 100);
        await node2.startAsync();
        const node2Address = getMultiAddr(node2.peerInfo);

        const node3 = await createNewBundle(16003, [node2Address], 100);
        await node3.startAsync();

        await sleep(4000);

        // nodes need to subscribe in order to forward message
        node1.subscribeCustom('hello', (message: P2PMessage) => {});
        node2.subscribeCustom('hello', (message: P2PMessage) => {});
        node3.subscribeCustom('hello', (message: P2PMessage) => {
          const expected: PeerNode = {
            host: '127.0.0.1',
            port: 16001,
          };
          expect(message.peerInfo).toEqual(expected);
        });

        await sleep(2000);

        // message will be propagated from 1 -> 2; 2 -> 3
        await node1.broadcastAsync('hello', Buffer.from('I am a Buffer'));

        await sleep(1000);

        // shutdown nodes
        await node1.stopAsync();
        await node2.stopAsync();
        await node3.stopAsync();

        done();
      },
      30 * 1000
    );

    it(
      'peer that broadcasted should get automatically added to peerBook',
      async done => {
        expect.assertions(3);

        const node1 = await createNewBundle(18000);
        await node1.startAsync();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(18001, [node1Address], 100);
        await node2.startAsync();

        const node3 = await createNewBundle(18002, [node1Address], 100);
        await node3.startAsync();

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

        // node3 has exactly 2 peers
        expect(node3.peerBook.getAllArray().length).toEqual(2);

        // cleanup
        await node1.stopAsync();
        await node2.stopAsync();
        await node3.stopAsync();

        done();
      },
      20 * 1000
    );
  });

  describe('dht', () => {
    // waiting for new js-libp2p-kad-dht release
    it.skip('discover peer via periodically DHT random walk', async done => {
      expect.assertions(3);

      const BOOTSTRAP_INTERVAL = 1000;
      // const RANDOM_WALK_INTERVAL = 1000;

      const node1 = await createNewBundle(
        undefined,
        undefined,
        undefined /*, RANDOM_WALK_INTERVAL*/
      );
      await node1.startAsync();

      const bootstrap_for_node2 = getMultiAddr(node1.peerInfo);
      const node2 = await createNewBundle(
        undefined,
        [bootstrap_for_node2],
        BOOTSTRAP_INTERVAL /*, RANDOM_WALK_INTERVAL*/
      );
      await node2.startAsync();

      const bootstrap_for_node3 = getMultiAddr(node2.peerInfo);
      const node3 = await createNewBundle(
        undefined,
        [bootstrap_for_node3],
        BOOTSTRAP_INTERVAL /*, RANDOM_WALK_INTERVAL*/
      );
      await node3.startAsync();

      // wait for all nodes to connect to each other via DHT randomWalk
      await delay(10000);

      // check if all nodes are connected
      expect(node1.peerBook.getAllArray().length).toEqual(2);
      expect(node2.peerBook.getAllArray().length).toEqual(2);
      expect(node3.peerBook.getAllArray().length).toEqual(2);

      await node1.stopAsync();
      await node2.stopAsync();
      await node3.stopAsync();
      done();
    }, 15000);
  });

  describe('getRandomNode', () => {
    it(
      'getRandomNode() - returns undefined when they are no peers in peerBook',
      async done => {
        const node1 = await createNewBundle(15000);
        await node1.startAsync();
        const result = await node1.getRandomNode();

        expect(result).toEqual(undefined);

        // cleanup
        await node1.stopAsync();
        done();
      },
      10 * 1000
    );

    it(
      'getRandomNode() - returns one peer when one peer is present',
      async done => {
        expect.assertions(2);

        const node1 = await createNewBundle(14000);
        await node1.startAsync();
        const node1Address = getMultiAddr(node1.peerInfo);

        const node2 = await createNewBundle(14001, [node1Address], 300);
        await node2.startAsync();
        await sleep(1000);

        expect(node1.peerBook.getAllArray().length).toEqual(1);

        // act
        const result = node2.getRandomNode();
        expect(result).toEqual({
          host: '127.0.0.1',
          port: 14000,
        });

        // cleanup
        await node1.stopAsync();
        await node2.stopAsync();

        done();
      },
      10 * 1000
    );

    it.skip('getRandomPeer() - returns first or second node even out on 100.000,- calls', async done => {
      expect.assertions(2);

      const node1 = await createNewBundle(13000);
      await node1.startAsync();
      const node2 = await createNewBundle(13001);
      await node1.startAsync();

      const node3 = await createNewBundle(13002);
      await node1.startAsync();

      // await node3.

      done();
    });
  });
});
