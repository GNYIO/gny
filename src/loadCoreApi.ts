
import BlocksApi from '../packages/api/blocksApi';
import AccountsApi from '../packages/api/accountsApi';
import DelegatesApi from '../packages/api/delgatesApi';
import PeerApi from '../packages/api/peerApi';
import { Modules, IScope } from './interfaces';

export default function loadCoreApi(modules: Modules, scope: IScope) {
  let blocksApi = new BlocksApi(modules, scope);
  let accountsApi = new AccountsApi(modules, scope);
  let delgatesApi = new DelegatesApi(modules, scope);
  let peerApi = new PeerApi(modules, scope);

  return {
    blocksApi,
    accountsApi,
    delgatesApi,
    peerApi,
  };
}