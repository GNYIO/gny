import * as express from 'express';
import { IScope } from '../../src/interfaces';

export default class BalancesApi {
  private library: IScope;
  constructor(library: IScope) {
    this.library = library;
    this.attachApi();
  }

  private getBalance = async (req) => {
    const offset = req.query.offset ? Number(req.query.offset) : 0
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const condition = { address: req.params.address }
    if (req.query.flag) {
      condition.flag = Number(req.query.flag)
    }
    const count = await global.app.sdb.count('Balance', condition)
    let balances = []
    if (count > 0) {
      balances = await global.app.sdb.findAll('Balance', { condition, limit, offset })
      const currencyMap = new Map()
      for (const b of balances) {
        currencyMap.set(b.currency, 1)
      }
      const assetNameList = Array.from(currencyMap.keys())
      const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1)
      const gaNameList = assetNameList.filter(n => n.indexOf('.') === -1)

      if (uiaNameList && uiaNameList.length) {
        const assets = await global.app.sdb.findAll('Asset', {
          condition: {
            name: { $in: uiaNameList },
          },
        })
        for (const a of assets) {
          currencyMap.set(a.name, a)
        }
      }
      if (gaNameList && gaNameList.length) {
        const gatewayAssets = await global.app.sdb.findAll('GatewayCurrency', {
          condition: {
            symbol: { $in: gaNameList },
          },
        })
        for (const a of gatewayAssets) {
          currencyMap.set(a.symbol, a)
        }
      }

      for (const b of balances) {
        b.asset = currencyMap.get(b.currency)
      }
    }
    return { count, balances }
  }

  private getAddressCurrencyBalance = async (req) => {
    const currency = req.params.currency
    const condition = {
      address: req.params.address,
      currency,
    }
    const balance = await global.app.sdb.findOne('Balance', { condition })
    if (!balance) return 'No balance'
    if (currency.indexOf('.') !== -1) {
      balance.asset = await global.app.sdb.findOne('Asset', { condition: { name: balance.currency } })
    } else {
      balance.asset = await global.app.sdb.findOne('GatewayCurrency', { condition: { symbol: balance.currency } })
    }

    return { balance }
  }

  private attachApi = () => {
    const router = express.Router();

    router.get('/:address', this.getBalance);
    router.get('/:address/:currency', this.getAddressCurrencyBalance);

    this.library.network.app.use('/api/balances', router);
    this.library.network.app.use((err: any, req: any, res: any, next: any) => {
      if (!err) return next();
      this.library.logger.error(req.url, err);
      return res.status(500).send({
        success: false,
        error: err.toString(),
      });
    });
  }
}
