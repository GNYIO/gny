
import BlocksApi from '../packages/api/blocksApi'
import AccountsApi from '../packages/api/accountsApi'
import DelegatesApi from '../packages/api/delgatesApi'
import { Modules, IScope } from './interfaces';

export default function loadCoreApi(modules: Modules, scope: IScope) {
  let blocksApi = new BlocksApi(modules, scope);
  let accountsApi = new AccountsApi(modules, scope);
  let delgatesApi = new DelegatesApi(modules, scope);

  return {
    blocksApi,
    accountsApi,
    delgatesApi,
  };
}