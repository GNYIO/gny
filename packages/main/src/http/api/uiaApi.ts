import { isAddress } from '@gny/utils';
import * as express from 'express';
import { Request, Response } from 'express';
import {
  IScope,
  Next,
  IIssuer,
  IHttpApi,
  ApiResult,
  IssuesWrapper,
  IssuerWrapper,
  IsIssuerWrapper,
  AssetsWrapper,
  AssetWrapper,
  BalancesWrapper,
  BalanceWrapper,
  IAssetHolder,
  AssetHoldersWrapper,
} from '@gny/interfaces';
import { StateHelper } from '../../../src/core/StateHelper';
import { Issuer } from '@gny/database-postgres';
import { Asset } from '@gny/database-postgres';
import { Balance } from '@gny/database-postgres';
import { joi } from '@gny/extended-joi';

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
    router.get('/holders/:currency', this.getAssetHolders);

    router.use((req: Request, res: Response) => {
      res.status(500).json({ success: false, error: 'API endpoint not found' });
    });

    this.library.network.app.use('/api/uia', router);
    this.library.network.app.use((err, req, res, next) => {
      if (!err) return next();
      this.library.logger.error(req.url);
      this.library.logger.error(err);

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
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/isIssuer/:address',
        statusCode: '422',
      });

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

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/isIssuer/:address',
        statusCode: '200',
      });

      const result: ApiResult<IsIssuerWrapper> = {
        success: true,
        isIssuer: issuer ? true : false,
        issuerName: issuer ? issuer.name : undefined,
      };
      return res.json(result);
    } catch (err) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/isIssuer/:address',
        statusCode: '500',
      });

      return next(`Failed to check for existing Issuer: ${err.message}`);
    }
  };

  private getIssuers = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(100),
      offset: joi
        .number()
        .integer()
        .min(0),
    });
    const report = joi.validate(query, limitOffset);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers',
        statusCode: '422',
      });

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

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers',
        statusCode: '200',
      });

      const result: ApiResult<IssuesWrapper> = {
        success: true,
        count,
        issues,
      };
      return res.json(result);
    } catch (dbErr) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers',
        statusCode: '500',
      });

      return next(`Failed to get issuers: ${dbErr}`);
    }
  };

  private getIssuer = async (req: Request, res: Response, next: Next) => {
    const query = req.params;
    const nameMustBeNameOrAddress = joi
      .object()
      .keys({
        name: joi
          .alternatives([joi.string().issuer(), joi.string().address()])
          .required(),
      })
      .required();
    const report = joi.validate(query, nameMustBeNameOrAddress);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers/:name',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const name: string = query.name;
    let result: ApiResult<IssuerWrapper>;
    try {
      if (isAddress(name)) {
        const issuer: IIssuer = await global.app.sdb.findOne<Issuer>(Issuer, {
          condition: { issuerId: name },
        });
        if (!issuer) {
          return next('Issuer not found');
        }
        result = {
          success: true,
          issuer,
        };

        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/uia/issuers/:name',
          statusCode: '200',
        });

        return res.json(result);
      } else {
        const issuer = await global.app.sdb.findOne<Issuer>(Issuer, {
          condition: {
            name: req.params.name,
          },
        });
        if (!issuer) {
          global.app.prom.requests.inc({
            method: 'GET',
            endpoint: '/api/uia/issuers/:name',
            statusCode: '500',
          });

          return next('Issuer not found');
        }

        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/uia/issuers/:name',
          statusCode: '200',
        });

        result = {
          success: true,
          issuer,
        };
        return res.json(result);
      }
    } catch (err) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers/:name',
        statusCode: '500',
      });

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
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers/:name/assets',
        statusCode: '422',
      });

      return res.status(422).send({
        success: false,
        error: nameReport.error.message,
      });
    }

    const { query } = req;
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(100),
      offset: joi
        .number()
        .integer()
        .min(0),
    });
    const report = joi.validate(query, limitOffset);
    if (report.error) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers/:name/assets',
        statusCode: '422',
      });

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
        global.app.prom.requests.inc({
          method: 'GET',
          endpoint: '/api/uia/issuers/:name/assets',
          statusCode: '500',
        });

        return next(`Issuer "${issuerName}" not found`);
      }

      const condition = { issuerId: issuer.issuerId };
      const count = await global.app.sdb.count<Asset>(Asset, condition);
      const assets = await global.app.sdb.findAll<Asset>(Asset, {
        condition,
        limit: query.limit || 100,
        offset: query.offset || 0,
      });

      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers/:name/assets',
        statusCode: '200',
      });

      const result: ApiResult<AssetsWrapper> = {
        success: true,
        count,
        assets,
      };
      return res.json(result);
    } catch (dbErr) {
      global.app.prom.requests.inc({
        method: 'GET',
        endpoint: '/api/uia/issuers/:name/assets',
        statusCode: '500',
      });

      return next(`Failed to get assets: ${dbErr}`);
    }
  };

  private getAssets = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    const limitOffset = joi.object().keys({
      limit: joi
        .number()
        .integer()
        .min(0)
        .max(100),
      offset: joi
        .number()
        .integer()
        .min(0),
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
      const result: ApiResult<AssetsWrapper> = {
        success: true,
        count,
        assets,
      };
      return res.json(result);
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
      const result: ApiResult<AssetWrapper> = {
        success: true,
        asset: assets[0],
      };
      return res.json(result);
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
      const result: ApiResult<BalancesWrapper> = {
        success: true,
        count,
        balances: balances,
      };
      return res.json(result);
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
      const result: ApiResult<BalanceWrapper> = {
        success: true,
        balance: balances[0],
      };
      return res.json(result);
    } catch (dbErr) {
      return next(`Failed to get issuers: ${dbErr}`);
    }
  };

  public getAssetHolders = async (req: Request, res: Response, next: Next) => {
    const { query } = req;
    query.currency = req.params.currency;

    const schema = joi.object().keys({
      currency: joi
        .string()
        .asset()
        .required(),
      limit: joi
        .number()
        .min(0)
        .max(100),
      offset: joi.number().min(0),
    });
    const report = joi.validate(query, schema);
    if (report.error) {
      return res.status(422).send({
        success: false,
        error: report.error.message,
      });
    }

    const currency = query.currency as string;

    try {
      const dbCurrency = await global.app.sdb.findOne<Asset>(Asset, {
        condition: {
          name: currency,
        },
      });
      if (!dbCurrency) {
        return next('could not find asset');
      }
    } catch (err) {
      return next('error during querying asset');
    }

    try {
      const count = await global.app.sdb.count<Balance>(Balance, {
        currency,
      });
      const assetHolders = await global.app.sdb.findAll<Balance>(Balance, {
        condition: {
          currency,
        },
        limit: Number(query.limit || 100),
        offset: Number(query.offset || 0),
        sort: {
          balance: -1,
        },
      });
      const result: ApiResult<AssetHoldersWrapper> = {
        success: true,
        count,
        holders: assetHolders.map(x => {
          const result: IAssetHolder = {
            address: x.address,
            balance: x.balance,
            currency: x.currency,
          };
          return result;
        }),
      };
      return res.json(result);
    } catch (dbErr) {
      return next(`Failed to get Holders: ${dbErr}`);
    }
  };
}
