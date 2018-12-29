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

  // Public Methods
  public getIssuerByAddress = async (req) => {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
      throw new Error('Invalid address');
    }
    try {
      const issues = await global.app.sdb.find('Issuer', { address: req.params.address });
      if (!issues || issues.length === 0) throw new Error('Issuer not found');
      return { issuer: issues[0] };
    } catch (dbErr) {
      throw new Error(`Failed to get issuer: ${dbErr}`);
    }
  }
}
