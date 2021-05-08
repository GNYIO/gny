import BlocksApi from './http/api/blocksApi';
import AccountsApi from './http/api/accountsApi';
import DelegatesApi from './http/api/delegatesApi';
import PeerApi from './http/api/peerApi';
import SystemApi from './http/api/systemApi';
import TransactionsApi from './http/api/transactionsApi';
import TransportApi from './http/api/transportApi';
import UiaApi from './http/api/uiaApi';
import LoaderApi from './http/api/loaderApi';
import TransfersApi from './http/api/transfersApi';
import ExchangeApi from './http/api/exchangeApi';
import MetricsApi from './http/api/metricsApi';
import { IScope, CoreApi } from '@gny/interfaces';

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
  const exchangeApi = new ExchangeApi(scope);
  const metricsApi = new MetricsApi(scope);

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
    exchangeApi,
    metricsApi,
  };
  return coreApi;
}
