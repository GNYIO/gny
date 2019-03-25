import BlocksApi from '../packages/http/api/blocksApi';
import AccountsApi from '../packages/http/api/accountsApi';
import DelegatesApi from '../packages/http/api/delegatesApi';
import PeerApi from '../packages/http/api/peerApi';
import SystemApi from '../packages/http/api/systemApi';
import TransactionsApi from '../packages/http/api/transactionsApi';
import TransportApi from '../packages/http/api/transportApi';
import UiaApi from '../packages/http/api/uiaApi';
import LoaderApi from '../packages/http/api/loaderApi';
import TransfersApi from '../packages/http/api/transfersApi';
import { Modules, IScope } from './interfaces';

export default function loadCoreApi(modules: Modules, scope: IScope) {
  const blocksApi = new BlocksApi(modules, scope);
  const accountsApi = new AccountsApi(modules, scope);
  const delgatesApi = new DelegatesApi(modules, scope);
  const peerApi = new PeerApi(modules, scope);
  const systemApi = new SystemApi(scope);
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
    systemApi,
    transactionsApi,
    transportApi,
    uiaApi,
    transfersApi,
    loaderApi
  };
}
