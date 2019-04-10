import addressHelper from '../../../src/utils/address';
import * as express from 'express';
import { Request, Response } from 'express';
import { Modules, IScope, Next } from '../../../src/interfaces';

export default class UiaApi {
  private modules: Modules;
  private library: IScope;
  private loaded = false;
  constructor(modules: Modules, scope: IScope) {
    this.modules = modules;
    this.library = scope;

    this.attachApi();
  }

  // Events
  public onBlockchainReady = () => {
    this.loaded = true;
  };

  private attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (this.modules && this.loaded === true) return next();
      return res
        .status(500)
        .json({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/issuers', this.getIssuers);
    router.get('/issuers/:name', this.getIssuer);
    router.get('/issuers/:name/assets', this.getIssuerAssets);
    router.get('/assets', this.getAssets);
    router.get('/assets/:name', this.getAsset);
    router.get('/balances/:address', this.getBalances);
    router.get('/balances/:address/:currency', this.getBalance);

    router.use((req: Request, res: Response) => {
      res.status(500).json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/uia', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url, err);
      return res.status(500).json({ success: false, error: err.toString() });
    });
  };

  private getIssuers = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi
        .number()
        .min(0)
        .max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }
    try {
      const count = await global.app.sdb.count('Issuer', {});
      const issues = await global.app.sdb.findAll('Issuer', {
        limit: query.limit || 100,
        offset: query.offset || 0,
      });
      return res.json({ count, issues });
    } catch (dbErr) {
      return next(`Failed to get issuers: ${dbErr}`);
    }
  };

  private getIssuer = async (req: Request, res: Response, next: Next) => {
    const query = req.params;
    const nameMustBeNameOrAddress = this.library.joi.object().keys({
      name: [
        this.library.joi.string().issuer(),
        this.library.joi.string().address(),
      ],
    });
    const report = this.library.joi.validate(query, nameMustBeNameOrAddress);
    if (report.error) {
      return next(report.error.message);
    }

    const name: string = query.name;
    try {
      if (addressHelper.isAddress(name)) {
        const issuer = await global.app.sdb.findOne('Issuer', {
          condition: { issuerId: name },
        });
        if (!issuer) {
          return next('Issuer not found');
        }
        return res.json({ issuer });
      } else {
        const issuer = await global.app.sdb.findOne('Issuer', {
          name: req.params.name,
        });
        if (!issuer) return next('Issuer not found');
        return res.json({ issuer: issuer });
      }
    } catch (err) {
      return next(err.toString());
    }
  };

  private getIssuerAssets = async (req: Request, res: Response, next: Next) => {
    const nameSchema = this.library.joi.object().keys({
      name: this.library.joi
        .string()
        .issuer()
        .required(),
    });
    const nameReport = this.library.joi.validate(req.params, nameSchema);
    if (nameReport.error) {
      return next(nameReport.error.message);
    }

    const { query } = req;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi
        .number()
        .min(0)
        .max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const issuerName = req.params.name;
      const issuer = await global.app.sdb.findOne('Issuer', {
        condition: { name: issuerName },
      });
      if (!issuer) {
        return next(`Issuer "${issuer}" not found`);
      }

      const condition = { issuerId: issuer.issuerId };
      const count = await global.app.sdb.count('Asset', condition);
      const assets = await global.app.sdb.findAll('Asset', {
        condition,
        limit: query.limit || 100,
        offset: query.offset || 0,
      });
      return res.json({ count, assets: assets });
    } catch (dbErr) {
      return next(`Failed to get assets: ${dbErr}`);
    }
  };

  private getAssets = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi
        .number()
        .min(0)
        .max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const condition = {};
      const count = await global.app.sdb.count('Asset', condition);
      const assets = await global.app.sdb.findAll('Asset', {
        condition,
        limit: query.limit || 100,
        offset: query.offset || 0,
      });
      return res.json({ count, assets: assets });
    } catch (dbErr) {
      return next(`Failed to get assets: ${dbErr}`);
    }
  };

  private getAsset = async (req: Request, res: Response, next: Next) => {
    const query = req.params;
    const nameSchema = this.library.joi.object().keys({
      name: this.library.joi
        .string()
        .asset()
        .required(),
    });
    const report = this.library.joi.validate(query, nameSchema);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const assets = await global.app.sdb.findAll('Asset', {
        condition: {
          name: query.name,
        },
      });
      if (!assets || assets.length === 0) return next('Asset not found');
      return res.json({ asset: assets[0] });
    } catch (dbErr) {
      return next(`Failed to get asset: ${dbErr}`);
    }
  };

  private getBalances = async (req: Request, res: Response, next: Next) => {
    const addressSchema = this.library.joi.object().keys({
      address: this.library.joi
        .string()
        .address()
        .required(),
    });
    const addressReport = this.library.joi.validate(req.params, addressSchema);
    if (addressReport.error) {
      return next(addressReport.error.message);
    }

    const { query } = req;
    const limitOffset = this.library.joi.object().keys({
      limit: this.library.joi
        .number()
        .min(0)
        .max(100),
      offset: this.library.joi.number().min(0),
    });
    const report = this.library.joi.validate(query, limitOffset);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const condition = { address: req.params.address };
      const count = await global.app.sdb.count('Balance', condition);
      const balances = await global.app.sdb.findAll('Balance', {
        condition,
        limit: query.limit,
        offset: query.offset,
      });
      return res.json({ count, balances: balances });
    } catch (dbErr) {
      return next(`Failed to get balances: ${dbErr}`);
    }
  };

  private getBalance = async (req: Request, res: Response, next: Next) => {
    const schema = this.library.joi.object().keys({
      address: this.library.joi
        .string()
        .address()
        .required(),
      currency: this.library.joi
        .string()
        .asset()
        .required(),
    });
    const report = this.library.joi.validate(req.params, schema);
    if (report.error) {
      return next(report.error.message);
    }

    try {
      const condition = {
        address: req.params.address,
        currency: req.params.currency,
      };
      const balances = await global.app.sdb.findAll('Balance', { condition });
      if (!balances || balances.length === 0)
        return next('Balance info not found');
      return res.json({ balance: balances[0] });
    } catch (dbErr) {
      return next(`Failed to get issuers: ${dbErr}`);
    }
  };
}
