import { http, ApiConfig } from './api';
import * as async from 'async';
import {
  SimplePeerInfo,
  PeerStateWrapper,
  DelegateViewModel,
  DelegateStateWrapper,
} from '@gny/interfaces';
import { slots } from '@gny/utils';
import { getBaseUrl } from '../getBaseUrl';

export async function peerstat() {
  const { data } = await http.get(getBaseUrl() + '/api/peers');
  const peers = data.peers;

  async.map(peers, async function(peer: SimplePeerInfo) {
    const { data } = await http.get(
      `http://${peer.simple.host}:${peer.simple.port}` + '/api/blocks/getHeight'
    );
    if (!data.success) {
      console.log(
        '%s:%d %s %d',
        peer.simple.host,
        peer.simple.port,
        data.error
      );
    } else {
      console.log(
        '%s:%d %s %d',
        peer.simple.host,
        peer.simple.port,
        data.height
      );
    }
  });

  async.map(peers, function(results: PeerStateWrapper[]) {
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
  });
}

export async function delegatestat() {
  const { data } = await http.get(getBaseUrl() + '/api/delegates');

  const delegates = data.delegates;
  if (!data.success) {
    console.log('Failed to get delegates', data.error);
  }

  async.map(
    delegates,
    async function(delegate: DelegateViewModel, next) {
      const params = {
        limit: 101,
        offset: 0,
        orderBy: 'height:desc',
      };
      const { data } = await http.get(getBaseUrl() + '/api/blocks', {
        params: params,
      });

      if (data.error) {
        console.log(data.error);
      } else {
        const blocks = data.blocks;
        for (let i = 0; i < blocks.length; ++i) {
          if (blocks[i].delegate === delegate.publicKey) {
            console.log({ delegate: delegate, block: blocks[i] });
          }
        }
      }
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
          slots.getRealTime(b ? b.timestamp : undefined)
        );
      }
    }
  );
}

export async function ipstat() {
  const { data } = await http.get(getBaseUrl() + '/api/peers');

  if (data.error) {
    console.log('Failed to get peers', data.error);
  }

  async.mapLimit(
    data.peers,
    5,
    async function(peer: SimplePeerInfo) {
      const url =
        'http://ip.taobao.com/service/getIpInfo.php?ip=' + peer.simple.host;
      const { data, status } = await http.get(url);
      if (data.error || status != 200) {
        console.error('Failed to get ip info:', data.error);
      } else {
        console.log(JSON.parse(data));
      }
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
}

export default function state(program: ApiConfig) {
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
