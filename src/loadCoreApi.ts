
import BlocksApi from '../packages/api/blocksApi';
import AccountsApi from '../packages/api/accountsApi';
import DelegatesApi from '../packages/api/delegatesApi';
import PeerApi from '../packages/api/peerApi';
import TransactionsApi from '../packages/api/transactionsApi';
import TransportApi from '../packages/api/transportApi';
import UiaApi from '../packages/api/uiaApi';
import LoaderApi from '../packages/api/loaderApi';
import TransfersApi from '../packages/api/transfersApi';
import { Modules, IScope } from './interfaces';

export default function loadCoreApi(modules: Modules, scope: IScope) {
  const blocksApi = new BlocksApi(modules, scope);
  const accountsApi = new AccountsApi(modules, scope);
  const delgatesApi = new DelegatesApi(modules, scope);
  const peerApi = new PeerApi(modules, scope);
  const transactionsApi = new TransactionsApi(modules, scope);
  const transportApi = new TransportApi(modules, scope);
  const uiaApi = new UiaApi(modules, scope);
  const transfersApi = new TransfersApi(scope);
  const loaderApi = new LoaderApi(modules, scope);

  return {
    blocksApi,
    accountsApi,
    delgatesApi,
    peerApi,
    transactionsApi,
    transportApi,
    uiaApi,
    transfersApi,
    loaderApi,
  };
}