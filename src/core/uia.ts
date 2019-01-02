import jsonSql = require('json-sql');

jsonSql().setDialect('sqlite');

import addressHelper from '../utils/address';
import { Modules, IScope } from '../interfaces';


// Constructor
export default class UIA {
  private readonly library: IScope;
  private modules: Modules;

  constructor (scope: IScope) {
    this.library = scope;
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope;
  }
}
