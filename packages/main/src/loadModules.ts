import Transactions from './core/transactions';
import Loader from './core/loader';
import Peer from './core/peer';
import Transport from './core/transport';
import Delegates from './core/delegates';
import Blocks from './core/blocks';

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
