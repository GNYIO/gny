import Transactions from './core/transactions';
import Loader from './core/loader';
import Peer from './core/peer';
import Transport from './core/transport';
import Delegates from './core/delegates';
import Blocks from './core/blocks';

import { Modules } from './interfaces';

export default function loadModules() {
  const modules: Modules = {
    transactions: Transactions,
    loader: Loader,
    peer: Peer,
    transport: Transport,
    delegates: Delegates,
    blocks: Blocks,
  };
  return modules;
}
