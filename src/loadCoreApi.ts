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
import { IScope, CoreApi } from './interfaces';

export default function loadCoreApi(scope: IScope) {
  const blocksApi = new BlocksApi(scope);
  const accountsApi = new AccountsApi(scope);
  const delgatesApi = new DelegatesApi(scope);
  const peerApi = new PeerApi(scope);
  const systemApi = new SystemApi(scope);
  const transactionsApi = new TransactionsApi(scope);
  const transportApi = new TransportApi(scope);
  const uiaApi = new UiaApi(scope);
  const transfersApi = new TransfersApi(scope);
  const loaderApi = new LoaderApi(scope);

  const coreApi: CoreApi = {
    blocksApi,
    accountsApi,
    delgatesApi,
    peerApi,
    systemApi,
    transactionsApi,
    transportApi,
    uiaApi,
    transfersApi,
    loaderApi,
  };
  return coreApi;
}
