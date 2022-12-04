import Transactions from './core/transactions.js';
import Loader from './core/loader.js';
import Peer from './core/peer.js';
import Transport from './core/transport.js';
import Delegates from './core/delegates.js';
import Blocks from './core/blocks.js';

import { Modules } from '@gny/interfaces';

export default function loadModules() {
  const modules: Modules = {
    // @ts-ignore
    transactions: Transactions,
    // @ts-ignore
    loader: Loader,
    peer: Peer,
    // @ts-ignore
    transport: Transport,
    // @ts-ignore
    delegates: Delegates,
    // @ts-ignore
    blocks: Blocks,
  };
  return modules;
}
