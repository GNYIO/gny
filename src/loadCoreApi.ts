
import BlocksApi from '../packages/api/blocksApi'
import AccountsApi from '../packages/api/accountsApi'
import { Modules, IScope } from './interfaces';

export default function loadCoreApi(modules: Modules, scope: IScope) {
  let blocksApi = new BlocksApi(modules, scope);
  let accountsApi = new AccountsApi(modules, scope);

  return {
    blocksApi,
    accountsApi
  };
}