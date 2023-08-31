import BlocksApi from './http/api/blocksApi.js';
import AccountsApi from './http/api/accountsApi.js';
import DelegatesApi from './http/api/delegatesApi.js';
import PeerApi from './http/api/peerApi.js';
import SystemApi from './http/api/systemApi.js';
import TransactionsApi from './http/api/transactionsApi.js';
import TransportApi from './http/api/transportApi.js';
import UiaApi from './http/api/uiaApi.js';
import LoaderApi from './http/api/loaderApi.js';
import TransfersApi from './http/api/transfersApi.js';
import ExchangeApi from './http/api/exchangeApi.js';
import MetricsApi from './http/api/metricsApi.js';
import NftApi from './http/api/nftApi.js';
import BurnApi from './http/api/burnApi.js';
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
  const nftApi = new NftApi(scope);
  const burnApi = new BurnApi(scope);

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
    nftApi,
    burnApi,
  };
  return coreApi;
}
