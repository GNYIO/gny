import * as ed from '../../src/utils/ed';
import addressHelper from '../../src/utils/address';
import * as crypto from 'crypto';
import * as express from 'express';
import { Request, Response } from 'express';
import { Modules, IScope, KeyPair, Next } from '../../src/interfaces';
import { ENTITY_EXTENSION_SYMBOL } from 'asch-smartdb';

export default class UiaApi {
  private modules: Modules;
  private library: IScope;
  constructor(modules: Modules, scope: IScope) {
    this.modules = modules;
    this.library = scope;

    this.attachApi();
  }

  private attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules) return next();
      return res.status(500).json({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/issuers', this.getIssuers);
    router.get('/issuers/:name', this.getIssuer);
    router.get('/issuers/:name/assets', this.getIssuerAssets);
    router.get('/assets', this.getAssets);
    router.get('/assets/:name', this.getAsset);
    router.get('/balances/:address', this.getBalances);
    router.get('/balances/:address/:currency', this.getBalance);
    router.put('/transfers', this.transferAsset);

    router.use((req: Request, res: Response) => {
      res.status(500).json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/uia', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err);
      return res.status(500).json({ success: false, error: err.toString() });
    });
  }

  private getIssuers = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi.number().min(0).max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }
    try {
      const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
      const count = await global.app.sdb.count('Issuer', {});
      const issues = await global.app.sdb.find('Issuer', {}, limitAndOffset);
      return res.json({ count, issues });
    } catch (dbErr) {
      return next(`Failed to get issuers: ${dbErr}`);
    }
  }

  private getIssuer = async (req: Request, res: Response, next: Next) => {
    const query = req.params;
    const nameMustBeNameOrAddress = this.library.joi.object().keys({
      name: [
        this.library.joi.string().publisher(),
        this.library.joi.string().address()
      ],
    });
    const report = this.library.joi.validate(query, nameMustBeNameOrAddress);
    if (report.error) {
      return next(report.error.message);
    }

    const name: string = query.name;
    try {
      if (addressHelper.isAddress(name)) {
        const issuer = await global.app.sdb.findOne('Issuer', { condition: { issuerId: name }});
        if (!issuer) {
          return next('Issuer not found');
        }
        return res.json({ issuer });
      } else {
        const issuers = await global.app.sdb.find('Issuer', { name: req.params.name });
        if (!issuers || issuers.length === 0) return next('Issuer not found');
        return res.json({ issuer: issuers[0] });
      }
    } catch (err) {
      return next(err.toString());
    }
  }

  private getIssuerAssets = async (req: Request, res: Response, next: Next) => {
    if (!req.params || !req.params.name || req.params.name.length > 32) {
      return next(' Invalid parameters');
    }
    const query = req.body;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi.number().min(0).max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
      const condition = { issuerName: req.params.name };
      const count = await global.app.sdb.count('Asset', condition);
      const assets = await global.app.sdb.find('Asset', condition, limitAndOffset);
      return res.json({ count, assets: assets });
    } catch (dbErr) {
      return next(`Failed to get assets: ${dbErr}`);
    }
  }

  private getAssets = async (req: Request, res: Response, next: Next) => {
    const query = req.body;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi.number().min(0).max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const condition = {};
      const limitAndOffset = { limit: query.limit || 100, offset: query.offset || 0 };
      const count = await global.app.sdb.count('Asset', condition);
      const assets = await global.app.sdb.find('Asset', condition, limitAndOffset);
      return res.json({ count, assets: assets });
    } catch (dbErr) {
      return next(`Failed to get assets: ${dbErr}`);
    }
  }

  private getAsset = async (req: Request, res: Response, next: Next) => {
    const query = req.params;
    const nameSchema = this.library.joi.object().keys({
      name: this.library.joi.string().name().min(1).max(32).required(), // uiaName
    });
    const report = this.library.joi.validate(query, nameSchema);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const condition = { name: query.name };
      const assets = await global.app.sdb.find('Asset', condition);
      if (!assets || assets.length === 0) return next('Asset not found');
      return res.json({ asset: assets[0] });
    } catch (dbErr) {
      return next(`Failed to get asset: ${dbErr}`);
    }
  }

  private getBalances = async (req: Request, res: Response, next: Next) => {
    if (!req.params || !addressHelper.isAddress(req.params.address)) {
      return next('Invalid address');
    }
    const query = req.body;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi.number().min(0).max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const condition = { address: req.params.address };
      const count = await global.app.sdb.count('Balance', condition);
      const resultRange = { limit: query.limit, offset: query.offset };
      const balances = await global.app.sdb.find('Balance', condition, resultRange);
      return res.json({ count, balances: balances });
    } catch (dbErr) {
      return next(`Failed to get balances: ${dbErr}`);
    }
  }

  private getBalance = async (req: Request, res: Response, next: Next) => {
    if (!req.params) return next('Invalid parameters');
    if (!addressHelper.isAddress(req.params.address)) return next('Invalid address');
    if (!req.params.currency || req.params.currency.length > 22) return next('Invalid currency');

    try {
      const condition = { address: req.params.address, currency: req.params.currency };
      let balances = await global.app.sdb.find('Balance', condition);
      if (!balances || balances.length === 0) return next('Balance info not found');
      balances = balances;
      return res.json({ balance: balances[0] });
    } catch (dbErr) {
      return next(`Failed to get issuers: ${dbErr}`);
    }
  }

  private transferAsset = (req: Request, res: Response, next: Next) => {
    const query = req.body;

    const schema = this.library.joi.object().keys({
      secret: this.library.joi.string().secret().required(),
      currency: this.library.joi.string().max(22).required(),
      amount: this.library.joi.string().max(50).required(),
      recipientId: this.library.joi.string().address().required(),
      publicKey: this.library.joi.string().publicKey(),
      secondSecret: this.library.joi.string().secret(),
      message: this.library.joi.string().max(256),
      fee: this.library.joi.number().min(10000000),
    });
    const report = this.library.joi.validate(query, schema);

    if (report.error) {
      this.library.logger.warn('Failed to validate query params', report.error.message);
      return next(report.error.message);
    }

    return this.library.sequence.add((callback) => {
      (async () => {
        try {
          const hash = crypto.createHash('sha256').update(query.secret, 'utf8').digest();
          const keypair = ed.generateKeyPair(hash);
          let secondKeypair: KeyPair = null;
          if (query.secondSecret) {
            secondKeypair = ed.generateKeyPair(crypto.createHash('sha256').update(query.secondSecret, 'utf8').digest());
          }
          const trs = this.library.base.transaction.create({
            secret: query.secret,
            fee: query.fee || 10000000,
            type: 103,
            senderId: query.senderId || null,
            args: [query.currency, query.amount, query.recipientId],
            message: query.message || null,
            secondKeypair,
            keypair,
          });
          await this.modules.transactions.processUnconfirmedTransactionAsync(trs);
          this.library.bus.message('unconfirmedTransaction', trs);
          callback(null, { transactionId: trs.id });
        } catch (e) {
          this.library.logger.warn('Failed to process unsigned transaction', e);
          callback(e.toString());
        }
      })();
    }, res);
  }
}