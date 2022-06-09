import * as _ from 'lodash';
import axios, { AxiosRequestConfig } from 'axios';
import { create } from '@gny/p2p';
import { PeerNode, ICoreModule, P2PPeerIdAndMultiaddr } from '@gny/interfaces';
import * as PeerId from 'peer-id';
import { attachDirectP2PCommunication } from './PeerHelper';
import Transport from './transport';
const uint8ArrayFromString = require('uint8arrays/from-string');
import * as multiaddr from 'multiaddr';
import { StateHelper } from './StateHelper';
import { BigNumber } from '@gny/utils';
import Loader from './loader';

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
      global.library.logger,
      global.Config.p2pConfig
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

    const startUpSpan = global.library.tracer.startSpan('startUp');
    startUpSpan.setTag('peerId', Peer.p2p.peerId.toB58String());
    startUpSpan.log({
      announceAddresses: Peer.p2p.addressManager
        .getAnnounceAddrs()
        .map(x => x.toString()),
      listenAddresses: Peer.p2p.addressManager
        .getListenAddrs()
        .map(x => x.toString()),
    });
    startUpSpan.finish();

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER,
      Transport.receivePeer_NewBlockHeader
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_NEW_BLOCK_HEADER
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_PROPOSE,
      Transport.receivePeer_Propose
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_PROPOSE
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_TRANSACTION,
      Transport.receivePeer_Transaction
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_TRANSACTION
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_NEW_MEMBER,
      Transport.receiveNew_Member
    );
    await Peer.p2p.pubsub.subscribe(
      global.Config.p2pConfig.V1_BROADCAST_NEW_MEMBER
    );

    Peer.p2p.pubsub.on(
      global.Config.p2pConfig.V1_BROADCAST_SELF,
      Transport.receiveSelf
    );
    await Peer.p2p.pubsub.subscribe(global.Config.p2pConfig.V1_BROADCAST_SELF);

    await sleep(2 * 1000);

    // sync to highest node, especially when the whole network is stuck
    let lastHeight = String(0);
    setInterval(async () => {
      const state = StateHelper.getState();
      const lastBlock = state.lastBlock;
      const newLastBlock = String(lastBlock.height);
      console.log(
        `lastHeight: ${lastHeight}, lastBlockHeight: ${newLastBlock}`
      );

      if (new BigNumber(lastHeight).isEqualTo(newLastBlock)) {
        // no new height for x seconds, look if any other node has a higher node
        global.library.tracer.startSpan('is stuck').finish();
        Loader.startSyncBlocks(lastBlock);
      } else {
        lastHeight = newLastBlock;
        return;
      }
    }, 30 * 1000);

    if (bootstrapNode.length > 0) {
      setInterval(async () => {
        if (!Peer.p2p.isStarted()) {
          return;
        }

        const bootstrapSpan = global.library.tracer.startSpan('bootstrap span');

        // go to all bootstrap peers
        //   1. add peer to addressBook, otherwise we can't dial it
        //   2. requestHello (check if is on same network)
        //     if yes
        //       continue with next peer
        //     if no
        //       hangUp on peer
        //       delete peer from peerStore
        //
        const multis = bootstrapNode.map(x => multiaddr(x));
        for (let i = 0; i < multis.length; ++i) {
          const oneSpan = global.library.tracer.startSpan('bootstrap one', {
            childOf: bootstrapSpan.context(),
          });

          const m = multis[i];
          const peer = PeerId.createFromB58String(m.getPeerId());

          global.library.logger.info(`[p2p] dial ${peer.toB58String()}`);
          oneSpan.log({
            dialingPeer: peer.toB58String(),
          });

          // check if there are addresses for this peer saved
          // otherwise dialing won't work
          const addresses = Peer.p2p.peerStore.addressBook.get(peer);
          if (!addresses) {
            Peer.p2p.peerStore.addressBook.set(peer, [m]);
            global.library.logger.info('[p2p] add peer to addressBook');
            oneSpan.log({
              log1: 'add peer to addressBook',
            });
          }

          global.library.logger.info(
            '[p2p] now we check if connection still valid by dialing protocol'
          );
          oneSpan.log({
            log2: 'now we check if connection still valid by dialing protocol',
          });

          let success = true;
          try {
            await Peer.p2p.requestHello(peer, oneSpan);
            global.library.logger.info('[p2p] successfully dialed peer');
            oneSpan.log({
              log3: 'successfully dialed peer',
            });
          } catch (err) {
            global.library.logger.error(
              '[p2p] error while trying to verify peer'
            );
            oneSpan.log({
              errorLog: 'error while trying to verify peer',
            });
            global.library.logger.error(`[p2p] err: ${err}`);
            oneSpan.log({
              err,
            });
            oneSpan.setTag('error', true);
            success = false;
          }

          // hangup on Peer
          if (success === false) {
            try {
              global.library.logger.info('[p2p] we are hangingUp on peer...');
              oneSpan.log({
                log4: 'we are hangingUp on peer...',
              });
              await Peer.p2p.hangUp(peer);
              global.library.logger.info('[p2p] hangUp worked');
              oneSpan.log({
                log5: 'hangUp worked',
              });
            } catch (err) {
              global.library.logger.error('[p2p] hangingUp did not work');
              oneSpan.log({
                logErr: 'hangingUp did not work',
              });
              global.library.logger.error(`[p2p] err: ${err}`);
              oneSpan.log({
                err: err,
              });
            }

            global.library.logger.info(
              '[p2p] going to remove peer from peerStore'
            );
            oneSpan.log({
              log5: 'going to remove peer from peerStore',
            });
            Peer.p2p.peerStore.delete(peer);
          } else {
            global.library.logger.info('[p2p] the peer stays in peerStore');
            oneSpan.log({
              log6: 'the peer stays in peerStore',
            });
          }

          global.library.logger.info(
            '[p2p] finished bootstrapSpan for one peer'
          );
          oneSpan.finish();
        }

        bootstrapSpan.finish();
      }, 10 * 1000);
    }
  };

  public static cleanup = cb => {
    Peer.p2p.stop(cb);
    global.library.logger.debug('Cleaning up core/peer');
  };
}
