import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import {
  create,
  V1_BROADCAST_NEW_BLOCK_HEADER,
  V1_BROADCAST_TRANSACTION,
  V1_BROADCAST_PROPOSE,
  V1_BROADCAST_NEW_MEMBER,
  V1_BROADCAST_SELF,
} from '@gny/p2p';
import { PeerNode, ICoreModule, P2PPeerIdAndMultiaddr } from '@gny/interfaces';
import * as PeerId from 'peer-id';
import { attachDirectP2PCommunication } from './PeerHelper';
import Transport from './transport';
const uint8ArrayFromString = require('uint8arrays/from-string');
import * as multiaddr from 'multiaddr';
import { TracerWrapper, serializedSpanContext } from '@gny/tracer';
import { EnvironmentPlugin } from 'webpack';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class Peer implements ICoreModule {
  public static p2p;

  public static getVersion = () => ({
    version: global.library.config.version,
    build: global.library.config.buildVersion,
    net: global.library.config.netVersion,
  });

  public static request = async (
    endpoint: string,
    body: any,
    contact: PeerNode,
    timeout?: number
  ) => {
    const address = `${contact.host}:${contact.port - 1}`;
    const uri = `http://${address}/peer/${endpoint}`;
    global.library.logger.debug(`start to request ${uri}`);
    const headers = {
      magic: global.Config.magic,
      version: global.Config.version,
    };

    let result;
    try {
      const config: AxiosRequestConfig = {
        headers: headers,
        responseType: 'json',
        timeout: undefined || timeout,
      };
      result = await axios.post(uri, body, config);
      if (result.status !== 200) {
        throw new Error(
          `Invalid status code: ${result.statusCode}, error: ${result.data}`
        );
      }
      return result.data;
    } catch (err) {
      const span = global.app.tracer.startSpan('request');
      span.setTag('error', true);
      span.log({
        value: `Failed to request remote peer: ${err.message}`,
      });
      span.finish();

      global.library.logger.error(
        `Failed to request remote peer: ${err.message}`
      );
      global.library.logger.error(
        JSON.stringify(err.response ? err.response.data : err.message)
      );
      throw err;
    }
  };

  public static randomRequestAsync = async (method: string, params: any) => {
    const randomNode = Peer.p2p.getConnectedRandomNode();
    if (!randomNode) throw new Error('no contact');
    global.library.logger.debug(
      `[p2p] select random contract: ${JSON.stringify(randomNode)}`
    );
    try {
      const result = await Peer.request(method, params, randomNode, 4000);
      return {
        data: result,
        node: randomNode,
      };
    } catch (err) {
      throw err;
    }
  };

  public static preparePeerId = async () => {
    const buf = Buffer.from(
      global.library.config.peers.privateP2PKey,
      'base64'
    );
    const peerId = await PeerId.createFromPrivKey(buf);

    return peerId;
  };

  // Events
  public static onBlockchainReady = async () => {
    const peerId = await Peer.preparePeerId();

    // TODO persist peerBook of node
    const bootstrapNode = global.library.config.peers.bootstrap
      ? global.library.config.peers.bootstrap
      : [];

    const wrapper = create(
      peerId,
      global.library.config.publicIp,
      global.library.config.peerPort,
      bootstrapNode,
      global.library.logger
    );
    Peer.p2p = wrapper;
    attachDirectP2PCommunication(Peer.p2p);

    await Peer.p2p.start();
    global.library.logger.info('[p2p] libp2p started');

    global.library.logger.info(
      `announceAddresses: ${JSON.stringify(
        Peer.p2p.addressManager.getAnnounceAddrs().map(x => x.toString())
      )}`
    );
    global.library.logger.info(
      `listenAddresses: ${JSON.stringify(
        Peer.p2p.addressManager.getListenAddrs().map(x => x.toString())
      )}`
    );
    global.library.logger.info(
      `noAnnounceAddresses: ${JSON.stringify(
        Peer.p2p.addressManager.getNoAnnounceAddrs().map(x => x.toString())
      )}`
    );

    Peer.p2p.pubsub.on(
      V1_BROADCAST_NEW_BLOCK_HEADER,
      Transport.receivePeer_NewBlockHeader
    );
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_NEW_BLOCK_HEADER);

    Peer.p2p.pubsub.on(V1_BROADCAST_PROPOSE, Transport.receivePeer_Propose);
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_PROPOSE);

    Peer.p2p.pubsub.on(
      V1_BROADCAST_TRANSACTION,
      Transport.receivePeer_Transaction
    );
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_TRANSACTION);

    Peer.p2p.pubsub.on(V1_BROADCAST_NEW_MEMBER, Transport.receiveNew_Member);
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_NEW_MEMBER);

    Peer.p2p.pubsub.on(V1_BROADCAST_SELF, Transport.receiveSelf);
    await Peer.p2p.pubsub.subscribe(V1_BROADCAST_SELF);

    await sleep(2 * 1000);

    setInterval(async () => {
      // announce every x seconds yourself to the network
      const m = Peer.p2p.addressManager
        .getAnnounceAddrs()
        .map(x => x.encapsulate(`/p2p/${Peer.p2p.peerId.toB58String()}`))
        .map(x => x.toString());

      const span = global.library.tracer.startSpan('broadcast self');

      const raw: TracerWrapper<P2PPeerIdAndMultiaddr> = {
        spanId: serializedSpanContext(global.library.tracer, span.context()),
        data: {
          peerId: Peer.p2p.peerId.toB58String(),
          multiaddr: m,
        },
      };
      console.log(
        `[p2p] "newMember" announcing myself to network: ${JSON.stringify(
          raw.data,
          null,
          2
        )}`
      );

      const converted = uint8ArrayFromString(JSON.stringify(raw));
      await Peer.p2p.broadcastSelf(converted);

      span.finish();
    }, 20 * 1000);

    if (bootstrapNode.length > 0) {
      setInterval(async () => {
        const parentSpan = global.library.tracer.startSpan('bootstrap');
        parentSpan.log({
          alreadyConnectedWith: Array.from(Peer.p2p.connections.keys()),
        });

        if (!Peer.p2p.isStarted()) {
          parentSpan.setTag('error', true);
          parentSpan.log({
            value: 'p2p is not started',
          });
          parentSpan.finish();
          return;
        }

        const multis = bootstrapNode.map(x => multiaddr(x));

        for (let i = 0; i < multis.length; ++i) {
          const span = global.library.tracer.startSpan('dial peer', {
            childOf: parentSpan.context(),
          });

          global.library.logger.info(
            `[p2p][bootstrap] ${i + 1}/${multis.length}`
          );
          const m = multis[i];
          const peer = PeerId.createFromB58String(m.getPeerId());

          span.log({
            value: `dialing peer: ${peer.toB58String()}`,
          });

          // check if there are addresses for this peer saved
          const addresses = Peer.p2p.peerStore.addressBook.get(peer);
          if (!addresses) {
            global.library.logger.info(
              `[p2p][bootstrap] add address for remote peer "${peer.toB58String()}", ${JSON.stringify(
                [m],
                null,
                2
              )}`
            );
            Peer.p2p.peerStore.addressBook.set(peer, [m]);

            span.log({
              value: 'add address to addressBook',
              peer: peer.toB58String(),
              multiaddr: m,
            });
          }

          // 0. no need to check if already in peerStore (peer always in peerStore)
          // 1. check if have connection
          // yes, then return
          // 2. if not, then dial
          const connections = Array.from(Peer.p2p.connections.keys());
          global.library.logger.info(
            `[p2p][bootstrap] connections: ${JSON.stringify(
              connections,
              null,
              2
            )}`
          );
          const inConnection = connections.find(x => x === peer.toB58String());
          if (inConnection) {
            global.library.logger.info(
              `[p2p][bootstrap] already connected to ${peer.toB58String()}`
            );

            span.log({
              value: `already connected to "${peer.toB58String()}"`,
            });
            span.log({
              value: 'going to next peer',
            });
            span.finish();

            continue; // for next remote peer
          }

          try {
            span.log({
              value: `dialing peer: "${peer.toB58String()}"`,
            });

            await Peer.p2p.dial(peer);

            span.log({
              value: `successfully dialed peer: "${peer.toB58String()}"`,
            });
          } catch (err) {
            global.library.logger.info(
              `[p2p][bootstrap] failed to dial: ${peer.toB58String()}, error: ${
                err.message
              }`
            );

            span.log({
              value: `[p2p][bootstrap] failed to dial: ${peer.toB58String()}, error: ${
                err.message
              }`,
            });
            span.log({
              value: 'going to next peer',
            });
            span.finish();

            continue; // for next remote peer
          }
          global.library.logger.info(
            `[p2p][bootsrap] successfully dialed ${peer.toB58String()}`
          );

          try {
            global.library.logger.info(
              `[p2p][boostrap] announcing "newMember" ${JSON.stringify(
                peer,
                null,
                2
              )}`
            );
            const raw: TracerWrapper<P2PPeerIdAndMultiaddr> = {
              spanId: serializedSpanContext(
                global.library.tracer,
                span.context()
              ),
              data: {
                peerId: peer.toB58String(),
                multiaddr: [m.toString()],
              },
            };
            const data = uint8ArrayFromString(JSON.stringify(raw));
            await Peer.p2p.broadcastNewMember(data);
          } catch (err) {
            global.library.logger.info(
              `[p2p][bootsrap] failed to announce peer "${peer.id}", error: ${
                err.message
              }`
            );

            span.log({
              value: `[p2p][bootsrap] failed to announce peer "${
                peer.id
              }", error: ${err.message}`,
            });
            span.setTag('error', true);
            span.finish();
          }
        }

        parentSpan.finish();
      }, 5 * 1000);
    }
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
