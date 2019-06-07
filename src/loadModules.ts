import Accounts from './core/accounts';
import Transactions from './core/transactions';
import Loader from './core/loader';
import Peer from './core/peer';
import Transport from './core/transport';
import Delegates from './core/delegates';
import Blocks from './core/blocks';

import { Modules, IScope } from './interfaces';

export default function loadModules(scope: IScope) {
  const accounts = new Accounts(scope);
  const transactions = new Transactions(scope);
  const loader = new Loader(scope);
  const peer = new Peer(scope);
  const transport = new Transport(scope);
  const delegates = new Delegates(scope);
  const blocks = new Blocks(scope);

  const modules: Modules = {
    accounts: accounts,
    transactions: transactions,
    loader: loader,
    peer: peer,
    transport: transport,
    delegates: delegates,
    blocks: blocks,
  };
  return modules;
}
