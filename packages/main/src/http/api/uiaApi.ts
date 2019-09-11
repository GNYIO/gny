import { isAddress } from '@gny/utils';
import * as express from 'express';
import { Request, Response } from 'express';
import { IScope, Next, IIssuer, IHttpApi } from '@gny/interfaces';
import { StateHelper } from '../../../src/core/StateHelper';
import { Issuer } from '@gny/database-postgres';
import { Asset } from '@gny/database-postgres';
import { Balance } from '@gny/database-postgres';
import { joi } from '@gny/extendedJoi';

export default class UiaApi implements IHttpApi {
  private library: IScope;
  constructor(scope: IScope) {
    this.library = scope;

    this.attachApi();
  }

  public attachApi = () => {
    const router = express.Router();

    router.use((req: Request, res: Response, next) => {
      if (StateHelper.BlockchainReady()) return next();
      return res
        .status(500)
        .json({ success: false, error: 'Blockchain is loading' });
    });

    router.get('/issuers', this.getIssuers);
    router.get('/isIssuer/:address', this.isIssuer);
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

  private isIssuer = async (req: Request, res: Response, next: Next) => {
    const query = req.params;
    const addressValidation = joi.object().keys({
      address: joi
        .string()
        .address()
        .required(),
    });
    const report = joi.validate(query, addressValidation);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }
    try {
      const issuer = await global.app.sdb.findOne<Issuer>(Issuer, {
        condition: {
          issuerId: query.address as string,
        },
      });

      return res.json({
        success: true,
        isIssuer: issuer ? true : false,
        issuerName: issuer ? issuer.name : undefined,
      });
    } catch (err) {
      return next(`Failed to check for existing Issuer: ${err.message}`);
    }
  };

  private getIssuers = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .min(0)
        .max(100),
      offset: joi.number().min(0),
    });
    const report = joi.validate(query, limitOffset);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }
    try {
      const count = await global.app.sdb.count<Issuer>(Issuer, {});
      const issues = await global.app.sdb.findAll<Issuer>(Issuer, {
        condition: {},
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
    const nameMustBeNameOrAddress = joi.object().keys({
      name: [joi.string().issuer(), joi.string().address()],
    });
    const report = joi.validate(query, nameMustBeNameOrAddress);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const name: string = query.name;
    try {
      if (isAddress(name)) {
        const issuer: IIssuer = await global.app.sdb.findOne<Issuer>(Issuer, {
          condition: { issuerId: name },
        });
        if (!issuer) {
          return next('Issuer not found');
        }
        return res.json({ issuer });
      } else {
        const issuer = await global.app.sdb.findOne<Issuer>(Issuer, {
          condition: {
            name: req.params.name,
          },
        });
        if (!issuer) return next('Issuer not found');
        return res.json({ issuer: issuer });
      }
    } catch (err) {
      return next(err.toString());
    }
  };

  private getIssuerAssets = async (req: Request, res: Response, next: Next) => {
    const nameSchema = joi.object().keys({
      name: joi
        .string()
        .issuer()
        .required(),
    });
    const nameReport = joi.validate(req.params, nameSchema);
    if (nameReport.error) {
      return res.status(422).send({
        success: false,
        error: nameReport.error.message,
      });
    }

    const { query } = req;
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .min(0)
        .max(100),
      offset: joi.number().min(0),
    });
    const report = joi.validate(query, limitOffset);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const issuerName = req.params.name;
      const issuer = await global.app.sdb.findOne<Issuer>(Issuer, {
        condition: { name: issuerName },
      });
      if (!issuer) {
        return next(`Issuer "${issuerName}" not found`);
      }

      const condition = { issuerId: issuer.issuerId };
      const count = await global.app.sdb.count<Asset>(Asset, condition);
      const assets = await global.app.sdb.findAll<Asset>(Asset, {
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
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .min(0)
        .max(100),
      offset: joi.number().min(0),
    });
    const report = joi.validate(query, limitOffset);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const condition = {};
      const count = await global.app.sdb.count<Asset>(Asset, condition);
      const assets = await global.app.sdb.findAll<Asset>(Asset, {
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
    const nameSchema = joi.object().keys({
      name: joi
        .string()
        .asset()
        .required(),
    });
    const report = joi.validate(query, nameSchema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const assets = await global.app.sdb.findAll<Asset>(Asset, {
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
    const addressSchema = joi.object().keys({
      address: joi
        .string()
        .address()
        .required(),
    });
    const addressReport = joi.validate(req.params, addressSchema);
    if (addressReport.error) {
      return res.status(422).send({
        success: false,
        error: addressReport.error.message,
      });
    }

    const { query } = req;
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .min(0)
        .max(100),
      offset: joi.number().min(0),
    });
    const report = joi.validate(query, limitOffset);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const condition = { address: req.params.address };
      const count = await global.app.sdb.count<Balance>(Balance, condition);
      const balances = await global.app.sdb.findAll<Balance>(Balance, {
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
    const schema = joi.object().keys({
      address: joi
        .string()
        .address()
        .required(),
      currency: joi
        .string()
        .asset()
        .required(),
    });
    const report = joi.validate(req.params, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    try {
      const condition = {
        address: req.params.address as string,
        currency: req.params.currency as string,
      };
      const balances = await global.app.sdb.findAll<Balance>(Balance, {
        condition,
      });
      if (!balances || balances.length === 0)
        return next('Balance info not found');
      return res.json({ balance: balances[0] });
    } catch (dbErr) {
      return next(`Failed to get issuers: ${dbErr}`);
    }
  };
}
