import { Api, ApiConfig } from './api';
import * as async from 'async';
import {
  SimplePeerInfo,
  PeerStateWrapper,
  DelegateViewModel,
  DelegateStateWrapper,
} from '@gny/interfaces';
import { slots } from '@gny/utils';
import * as request from 'request';

let globalOptions: ApiConfig;

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
  });
}

function peerstat() {
  getApi().get('/api/peers/', {}, function(err, result) {
    if (err) {
      console.log('Failed to get peers', err);
      return;
    }
    async.map(
      result.peers,
      function(peer: SimplePeerInfo, next) {
        new Api({ host: peer.simple.host, port: peer.simple.port }).get(
          '/api/blocks/getHeight',
          function(err, result) {
            if (err) {
              console.log(
                '%s:%d %s %d',
                peer.simple.host,
                peer.simple.port,
                err
              );
              next(null, { peer: peer, error: err });
            } else {
              console.log(
                '%s:%d %s %d',
                peer.simple.host,
                peer.simple.port,
                result.height
              );
              next(null, { peer: peer, height: result.height });
            }
          }
        );
      },
      function(err, results: PeerStateWrapper[]) {
        const heightMap = {};
        const errorMap = {};
        for (let i = 0; i < results.length; ++i) {
          const item = results[i];
          if (item.error) {
            if (!errorMap[item.error]) {
              errorMap[item.error] = [];
            }
            errorMap[item.error].push(item.peer);
          } else {
            if (!heightMap[item.height]) {
              heightMap[item.height] = [];
            }
            heightMap[item.height].push(item.peer);
          }
        }
        const normalList = [];
        const errList = [];
        for (const k in heightMap) {
          normalList.push({ peers: heightMap[k], height: k });
        }
        for (const k in errorMap) {
          errList.push({ peers: errorMap[k], error: k });
        }
        normalList.sort(function(l, r) {
          return r.height - l.height;
        });

        function joinPeerAddrs(peers) {
          const peerAddrs = [];
          peers.forEach(function(p) {
            peerAddrs.push(p.host + ':' + p.port);
          });
          return peerAddrs.join(',');
        }
        console.log('======================================');
        for (let i = 0; i < normalList.length; ++i) {
          const item = normalList[i];
          if (i == 0) {
            console.log(item.peers.length + ' height: ' + item.height);
          } else {
            console.log(
              item.peers.length + ' height: ' + item.height,
              joinPeerAddrs(item.peers)
            );
          }
        }
        for (let i = 0; i < errList.length; ++i) {
          const item = errList[i];
          console.log(
            item.peers.length + ' error: ' + item.error,
            joinPeerAddrs(item.peers)
          );
        }
      }
    );
  });
}

function delegatestat() {
  getApi().get('/api/delegates', {}, function(err, result) {
    if (err) {
      console.log('Failed to get delegates', err);
      return;
    }
    async.map(
      result.delegates,
      function(delegate: DelegateViewModel, next) {
        const params = {
          limit: 101,
          offset: 0,
          orderBy: 'height:desc',
        };
        getApi().get('/api/blocks', params, function(err, result) {
          if (err) {
            next(err);
          } else {
            const blocks = result.blocks;
            for (let i = 0; i < blocks.length; ++i) {
              if (blocks[i].delegate === delegate.publicKey) {
                next(null, { delegate: delegate, block: blocks[i] });
              }
            }
          }
        });
      },
      function(err, delegates: DelegateStateWrapper[]) {
        if (err) {
          console.log('Failed to get forged block', err);
          return;
        }
        delegates = delegates.sort(function(l, r) {
          if (!l.block) {
            return -1;
          }
          if (!r.block) {
            return 1;
          }
          return l.block.timestamp - r.block.timestamp;
        });
        console.log('name\taddress\tproduced\tmissed\theight\tid\ttime');
        for (const i in delegates) {
          const d = delegates[i].delegate;
          const b = delegates[i].block;
          console.log(
            '%s\t%s\t%s\t%s\t%s\t%s\t%s',
            d.username,
            d.address,
            d.producedBlocks,
            d.missedBlocks,
            b ? b.height : '',
            b ? b.id : '',
            slots.getRealTime(b ? b.timestamp : '')
          );
        }
      }
    );
  });
}

function ipstat() {
  getApi().get('/api/peers/', {}, function(err, result) {
    if (err) {
      console.log('Failed to get peers', err);
      return;
    }
    async.mapLimit(
      result.peers,
      5,
      function(peer: SimplePeerInfo, next) {
        const url =
          'http://ip.taobao.com/service/getIpInfo.php?ip=' + peer.simple.host;
        request(url, function(err, resp, body) {
          if (err || resp.statusCode != 200) {
            console.error('Failed to get ip info:', err);
            next(null, {});
          } else {
            next(null, JSON.parse(body).data);
          }
        });
      },
      function(err, ips: any) {
        for (let i = 0; i < ips.length; ++i) {
          const ip = ips[i];
          if (ip.country_id) {
            console.log('%s\t%s', ip.country, ip.country_id);
          }
        }
      }
    );
  });
}

export default function state(program: ApiConfig) {
  globalOptions = program;

  program
    .command('peerstat')
    .description('analyze block height of all peers')
    .action(peerstat);

  program
    .command('delegatestat')
    .description('analyze delegates status')
    .action(delegatestat);

  program
    .command('ipstat')
    .description('analyze peer ip info')
    .action(ipstat);
}
