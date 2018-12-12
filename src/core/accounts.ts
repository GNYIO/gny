import { Modules, IScope } from '../interfaces';

export default class Account {
  private modules: Modules;
  private readonly library: IScope;

  constructor(scope: IScope) {
    this.library = scope;
  }

  // Events
  onBind = (scope: Modules) => {
    this.modules = scope;
  }
}