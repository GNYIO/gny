import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Next } from '../../../src/interfaces';
import { In } from 'typeorm';

export default class TransfersApi {
  private library: IScope;
  private loaded = false;
  constructor(library: IScope) {
    this.library = library;

    this.attachApi();
  }
  // Events
  public onBlockchainReady = () => {
    this.loaded = true;
  };

  private attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (this.loaded === true) return next();
      return res
        .status(500)
        .json({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/', this.getRoot);
    router.get('/amount', this.getAmount);

    router.use((req: Request, res: Response) => {
      return res
        .status(500)
        .send({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/transfers', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err.toString());
      return res.status(500).send({ success: false, error: err.toString() });
    });
  };

  private getRoot = async (req: Request, res: Response, next: Next) => {
    const condition: any = {};
    const ownerId = req.query.ownerId;
    const currency = req.query.currency;
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
    const count = await global.app.sdb.count('Transfer', condition);
    let transfers = [];
    if (count > 0) {
      transfers = await global.app.sdb.findAll('Transfer', {
        condition,
        limit,
        offset,
        sort: { timestamp: -1 },
      });
      const assetNames = new Set<string>();
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
    return res.json({ count, transfers });
  };

  private getAmount = async (req: Request, res: Response, next: Next) => {
    const startTimestamp = req.query.startTimestamp;
    const endTimestamp = req.query.endTimestamp;
    const condition: any = {};
    if (startTimestamp && endTimestamp) {
      condition.timestamp = { $between: [startTimestamp, endTimestamp] };
    }
    condition.currency = 'GNY';

    const count = await global.app.sdb.count('Transfer', condition);
    let transfers = [];
    if (count > 0) {
      transfers = await global.app.sdb.findAll('Transfer', {
        condition,
        sort: { timestamp: -1 },
      });
      const assetNames = new Set<string>();
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
    return res.json({ count, strTotalAmount });
  };

  // helper function
  private getAssetMap = async (assetNames: Set<string>) => {
    const assetMap = new Map();
    const assetNameList = Array.from(assetNames.keys());
    const uiaNameList = assetNameList.filter(n => n.indexOf('.') !== -1);

    if (uiaNameList && uiaNameList.length) {
      const assets = await global.app.sdb.findAll('Asset', {
        condition: {
          name: {
            $in: uiaNameList,
          },
        },
      });
      for (const a of assets) {
        assetMap.set(a.name, a);
      }
    }
    return assetMap;
  };

  // helper function
  private getTransactionMap = async tids => {
    const trsMap = new Map();
    const trs = await global.app.sdb.findAll('Transaction', {
      condition: {
        id: {
          $in: tids,
        },
      },
    });
    for (const t of trs) {
      trsMap.set(t.id, t);
    }
    return trsMap;
  };
}
