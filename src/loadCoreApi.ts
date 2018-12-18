
import BlocksApi from '../packages/api/blocksApi';
import AccountsApi from '../packages/api/accountsApi';
import DelegatesApi from '../packages/api/delgatesApi';
import PeerApi from '../packages/api/peerApi';
import TransactionsApi from '../packages/api/transactionsApi';
import TransportApi from '../packages/api/transportApi';
import UiaApi from '../packages/api/uiaApi';
import TransfersApi from '../packages/api/transfersApi';
import { Modules, IScope } from './interfaces';

export default function loadCoreApi(modules: Modules, scope: IScope) {
  let blocksApi = new BlocksApi(modules, scope);
  let accountsApi = new AccountsApi(modules, scope);
  let delgatesApi = new DelegatesApi(modules, scope);
  let peerApi = new PeerApi(modules, scope);
  let transactionsApi = new TransactionsApi(modules, scope);
  let transportApi = new TransportApi(modules, scope);
  let uiaApi = new UiaApi(modules, scope);
  let transfersApi = new TransfersApi(modules, scope);

  return {
    blocksApi,
    accountsApi,
    delgatesApi,
    peerApi,
    transactionsApi,
    transportApi,
    uiaApi,
    transfersApi,
  };
}