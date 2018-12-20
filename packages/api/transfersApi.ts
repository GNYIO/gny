import * as express from 'express';
import { IScope, Modules } from '../../src/interfaces';

export default class TransfersApi {

  private modules: Modules;
  private library: IScope;
  constructor (modules: Modules, library: IScope) {
    this.modules = modules;
    this.library = library;

    this.attachApi();
  }

  // helper function
  private getAssetMap = async (assetNames) => {
    const assetMap = new Map();
    const assetNameList = Array.from(assetNames.keys());
    const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);
    const gaNameList = assetNameList.filter(n => n.indexOf('.') === -1);
  
    if (uiaNameList && uiaNameList.length) {
      const assets = await global.app.sdb.findAll('Asset', {
        condition: {
          name: { $in: uiaNameList },
        },
      });
      for (const a of assets) {
        assetMap.set(a.name, a);
      }
    }
    if (gaNameList && gaNameList.length) {
      const gatewayAssets = await global.app.sdb.findAll('GatewayCurrency', {
        condition: {
          symbol: { $in: gaNameList },
        },
      });
      for (const a of gatewayAssets) {
        assetMap.set(a.symbol, a);
      }
    }
    return assetMap;
  }

  // helper function
  private getTransactionMap = async (tids) => {
    const trsMap = new Map()
    const trs = await global.app.sdb.findAll('Transaction', {
      condition: {
        id: { $in: tids },
      },
    });
    for (const t of trs) {
      trsMap.set(t.id, t);
    }
    return trsMap;
  }

  private getRoot = async (req) => {
    const ownerId = req.query.ownerId;
    const currency = req.query.currency;
    const condition = {};
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    if (ownerId) {
      condition.$or = {
        senderId: ownerId,
        recipientId: ownerId,
      };
    }
    if (currency) {
      condition.currency = currency;
    }
    if (req.query.senderId) {
      condition.senderId = req.query.senderId;
    }
    if (req.query.recipientId) {
      condition.recipientId = req.query.recipientId;
    }
    const count = await global.app.sdb.count('Transfer', condition)
    let transfers = []
    if (count > 0) {
      transfers = await global.app.sdb.findAll('Transfer', {
        condition,
        limit,
        offset,
        sort: { timestamp: -1 },
      });
      const assetNames = new Set();
      for (const t of transfers) {
        if (t.currency !== 'GNY') {
          assetNames.add(t.currency);
        }
      }
      const assetMap = await this.getAssetMap(assetNames);
      const tids = transfers.map(t => t.tid);
      const trsMap = await this.getTransactionMap(tids);
      for (const t of transfers) {
        if (t.currency !== 'GNY') {
          t.asset = assetMap.get(t.currency);
        }
        t.transaction = trsMap.get(t.tid);
      }
    }
    for (const t of transfers) {
      if (t.amount) {
        const pos = t.amount.indexOf('.');
        if (pos !== -1) {
          t.amount = t.amount.slice(0, pos);
        }
      }
    }
    return { count, transfers };
  }

  private getAmount = async (req) => {
    const startTimestamp = req.query.startTimestamp;
    const endTimestamp = req.query.endTimestamp;
    const condition = {};
    if (startTimestamp && endTimestamp) {
      condition.timestamp = { $between: [startTimestamp, endTimestamp] };
    }
    condition.currency = 'GNY';

    const count = await global.app.sdb.count('Transfer', condition)
    let transfers = []
    if (count > 0) {
      transfers = await global.app.sdb.findAll('Transfer', {
        condition,
        sort: { timestamp: -1 },
      });
      const assetNames = new Set();
      for (const t of transfers) {
        if (t.currency !== 'GNY') {
          assetNames.add(t.currency);
        }
      }
      const assetMap = await this.getAssetMap(assetNames);
      const tids = transfers.map(t => t.tid);
      const trsMap = await this.getTransactionMap(tids);
      for (const t of transfers) {
        if (t.currency !== 'GNY') {
          t.asset = assetMap.get(t.currency);
        }
        t.transaction = trsMap.get(t.tid);
      }
    }
    let totalAmount = 0;
    for (const t of transfers) {
      if (t.amount) {
        const pos = t.amount.indexOf('.');
        if (pos !== -1) {
          t.amount = t.amount.slice(0, pos);
        }
        totalAmount += Number(t.amount);
      }
    }
    const strTotalAmount = String(totalAmount);
    return { count, strTotalAmount };
  }

  private attachApi = () => {
    const router = express.Router();
    router.get('/', this.getRoot);
    router.get('/amount', this.getAmount);
  }
}