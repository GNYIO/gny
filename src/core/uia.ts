import jsonSql = require('json-sql');

jsonSql().setDialect('sqlite')

import addressHelper from '../utils/address';
import { Modules, IScope } from '../interfaces';


// Constructor
export default class UIA {
  private readonly library: IScope;
  private modules: Modules;

  constructor (scope: IScope) {
    this.library = scope
  }

  // Events
  public onBind = (scope: Modules) => {
    this.modules = scope
  }

  // Public Methods
  public getIssuerByAddress = (req, cb) => {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
      return cb('Invalid address')
    }
    return (async () => {
      try {
        const issues = await global.app.sdb.find('Issuer', { address: req.params.address })
        if (!issues || issues.length === 0) return cb('Issuer not found')
        return cb(null, { issuer: issues[0] })
      } catch (dbErr) {
        return cb(`Failed to get issuer: ${dbErr}`)
      }
    })()
  }
}
